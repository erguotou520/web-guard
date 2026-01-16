use sqlx::PgPool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{RwLock, Semaphore};
use tokio::time::{interval, MissedTickBehavior};
use uuid::Uuid;

use crate::config::Config;
use crate::db::models::{Monitor, MonitorType};
use crate::db::queries;
use crate::error::AppResult;
use crate::monitors::{check_ssl_certificate, check_uptime};

/// Task type for monitoring
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum MonitorTask {
    SslCheck { domain_id: Uuid, domain_name: String },
    UptimeCheck { domain_id: Uuid, domain_name: String },
}

/// Task scheduler for monitoring
pub struct MonitorScheduler {
    pool: PgPool,
    config: Config,
    task_queue: Arc<RwLock<Vec<MonitorTask>>>,
    running_tasks: Arc<RwLock<HashMap<Uuid, bool>>>,
    semaphore: Arc<Semaphore>,
}

impl MonitorScheduler {
    /// Create a new scheduler
    pub fn new(pool: PgPool, config: Config) -> Self {
        let max_concurrent = config.monitoring.max_concurrent_checks;
        Self {
            pool,
            config,
            task_queue: Arc::new(RwLock::new(Vec::new())),
            running_tasks: Arc::new(RwLock::new(HashMap::new())),
            semaphore: Arc::new(Semaphore::new(max_concurrent as usize)),
        }
    }

    /// Start the scheduler
    pub async fn start(&self) -> AppResult<()> {
        let poll_interval_secs = self.config.monitoring.poll_interval.as_secs();
        let mut ticker = interval(Duration::from_secs(poll_interval_secs));
        ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

        // Separate ticker for aggregate computation (every 30 minutes)
        let mut aggregate_ticker = interval(Duration::from_secs(1800)); // 30 minutes
        aggregate_ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

        // Spawn aggregate computation task
        let pool_clone = self.pool.clone();
        tokio::spawn(async move {
            loop {
                aggregate_ticker.tick().await;
                if let Err(e) = Self::compute_aggregates(pool_clone.clone()).await {
                    eprintln!("Failed to compute aggregates: {}", e);
                }
            }
        });

        loop {
            ticker.tick().await;

            // Load pending tasks from database
            if let Err(e) = self.load_and_schedule_tasks().await {
                eprintln!("Failed to load tasks: {}", e);
            }

            // Process tasks
            if let Err(e) = self.process_tasks().await {
                eprintln!("Failed to process tasks: {}", e);
            }
        }
    }

    /// Load tasks from database and schedule them
    async fn load_and_schedule_tasks(&self) -> AppResult<()> {
        // Get all active monitors
        let monitors = queries::list_all_active_monitors(&self.pool).await?;

        let mut queue = self.task_queue.write().await;
        queue.clear();

        for monitor in monitors {
            // Get domain name
            let domain = queries::find_domain_by_id(&self.pool, monitor.domain_id).await?;
            let domain_name = match domain {
                Some(d) => d.name,
                None => {
                    eprintln!("Domain not found for monitor: {}", monitor.domain_id);
                    continue;
                }
            };

            let task = match monitor.monitor_type {
                MonitorType::DomainDns => continue, // Skip DNS for now
                MonitorType::SslCert => MonitorTask::SslCheck {
                    domain_id: monitor.domain_id,
                    domain_name,
                },
                MonitorType::Uptime => MonitorTask::UptimeCheck {
                    domain_id: monitor.domain_id,
                    domain_name,
                },
                MonitorType::SecurityHeaders => continue, // Skip for now
            };

            queue.push(task);
        }

        Ok(())
    }

    /// Process all queued tasks
    async fn process_tasks(&self) -> AppResult<()> {
        let tasks = {
            let queue = self.task_queue.read().await;
            queue.clone()
        };

        for task in tasks {
            let permit = self.semaphore.clone().acquire_owned().await.unwrap();

            let pool = self.pool.clone();
            let config = self.config.clone();
            let running_tasks = self.running_tasks.clone();

            tokio::spawn(async move {
                let _permit = permit; // Hold permit for the duration of the task

                // Check if task is already running
                let task_id = match &task {
                    MonitorTask::SslCheck { domain_id, .. } => *domain_id,
                    MonitorTask::UptimeCheck { domain_id, .. } => *domain_id,
                };

                {
                    let running = running_tasks.read().await;
                    if *running.get(&task_id).unwrap_or(&false) {
                        return; // Skip if already running
                    }
                }

                // Mark as running
                {
                    let mut running = running_tasks.write().await;
                    running.insert(task_id, true);
                }

                // Execute task
                let result = match &task {
                    MonitorTask::SslCheck { domain_id, domain_name } => {
                        Self::execute_ssl_check(pool.clone(), *domain_id, domain_name).await
                    }
                    MonitorTask::UptimeCheck { domain_id, domain_name } => {
                        Self::execute_uptime_check(pool.clone(), *domain_id, domain_name, config).await
                    }
                };

                // Mark as not running
                {
                    let mut running = running_tasks.write().await;
                    running.remove(&task_id);
                }

                if let Err(e) = result {
                    eprintln!("Task failed: {:?}", e);
                }
            });
        }

        Ok(())
    }

    /// Execute SSL certificate check
    async fn execute_ssl_check(
        pool: PgPool,
        domain_id: Uuid,
        domain_name: &str,
    ) -> AppResult<()> {
        let cert_info = check_ssl_certificate(domain_name).await?;

        // Save SSL snapshot
        queries::create_ssl_cert_snapshot(
            &pool,
            domain_id,
            &cert_info.issuer,
            &cert_info.subject,
            cert_info.valid_from,
            cert_info.valid_until,
            cert_info.is_expired,
            cert_info.days_until_expiry,
            cert_info.is_self_signed,
        ).await?;

        // Check if cert is expiring soon and create alert
        if cert_info.days_until_expiry < 30 && cert_info.days_until_expiry > 0 {
            queries::create_simple_alert(
                &pool,
                domain_id,
                "SSL Certificate Expiring Soon",
                &format!(
                    "SSL certificate for {} expires in {} days (on {})",
                    domain_name,
                    cert_info.days_until_expiry,
                    cert_info.valid_until.format("%Y-%m-%d")
                ),
            ).await?;
        }

        // Create alert if expired
        if cert_info.is_expired {
            queries::create_simple_alert(
                &pool,
                domain_id,
                "SSL Certificate Expired",
                &format!(
                    "SSL certificate for {} expired on {}",
                    domain_name,
                    cert_info.valid_until.format("%Y-%m-%d")
                ),
            ).await?;
        }

        Ok(())
    }

    /// Execute uptime check
    async fn execute_uptime_check(
        pool: PgPool,
        domain_id: Uuid,
        domain_name: &str,
        config: Config,
    ) -> AppResult<()> {
        let uptime_result = check_uptime(domain_name, None).await?;

        // Save uptime snapshot
        queries::create_uptime_snapshot(
            &pool,
            domain_id,
            uptime_result.is_up,
            uptime_result.status_code.map(|c| c as i32),
            uptime_result.response_time_ms as i32,
            uptime_result.error_message.as_deref(),
        ).await?;

        // Create alert if site is down
        if !uptime_result.is_up {
            queries::create_simple_alert(
                &pool,
                domain_id,
                "Website Down",
                &format!(
                    "Website {} is down. Status: {}. Error: {}",
                    domain_name,
                    uptime_result.status_code.map_or("Unknown".to_string(), |s| s.to_string()),
                    uptime_result.error_message.unwrap_or_else(|| "Unknown error".to_string())
                ),
            ).await?;
        }

        // Create alert if response time is high
        if uptime_result.response_time_ms > config.monitoring.slow_threshold_ms {
            queries::create_simple_alert(
                &pool,
                domain_id,
                "Slow Response Time",
                &format!(
                    "Website {} is slow. Response time: {}ms",
                    domain_name, uptime_result.response_time_ms
                ),
            ).await?;
        }

        Ok(())
    }

    /// Manually trigger a check for a specific domain
    pub async fn trigger_domain_check(&self, domain_id: Uuid, domain_name: &str) -> AppResult<()> {
        // Trigger SSL check
        let pool = self.pool.clone();
        let domain_name_clone = domain_name.to_string();
        tokio::spawn(async move {
            if let Err(e) = Self::execute_ssl_check(pool.clone(), domain_id, &domain_name_clone).await {
                eprintln!("Manual SSL check failed: {}", e);
            }
        });

        // Trigger uptime check
        let pool = self.pool.clone();
        let domain_name_clone2 = domain_name.to_string();
        let config = self.config.clone();
        tokio::spawn(async move {
            if let Err(e) = Self::execute_uptime_check(pool.clone(), domain_id, &domain_name_clone2, config).await {
                eprintln!("Manual uptime check failed: {}", e);
            }
        });

        Ok(())
    }

    /// Compute and save uptime aggregates for all active domains
    async fn compute_aggregates(pool: PgPool) -> AppResult<()> {
        use chrono::{Datelike, Timelike, Utc};

        tracing::info!("Computing uptime aggregates...");

        // Get all active domains
        let domains = queries::list_all_active_domains(&pool).await?;

        let now = Utc::now();

        for domain in domains {
            // Compute hourly aggregate for the last completed hour
            let current_hour = now.with_minute(0).and_then(|dt| dt.with_second(0)).and_then(|dt| dt.with_nanosecond(0));
            if let Some(hour_end) = current_hour {
                let hour_start = hour_end - chrono::Duration::hours(1);

                if let Err(e) = queries::compute_uptime_aggregate(
                    &pool,
                    domain.id,
                    hour_start,
                    hour_end,
                    "hour",
                ).await {
                    eprintln!("Failed to compute hourly aggregate for domain {}: {}", domain.id, e);
                }
            }

            // Compute daily aggregate for the last completed day (once per day)
            // Only compute if it's the first hour of the day
            if now.hour() == 0 {
                if let Some(day_end) = now.date_naive().and_hms_opt(0, 0, 0) {
                    let day_end = day_end.and_utc();
                    let day_start = day_end - chrono::Duration::days(1);

                    if let Err(e) = queries::compute_uptime_aggregate(
                        &pool,
                        domain.id,
                        day_start,
                        day_end,
                        "day",
                    ).await {
                        eprintln!("Failed to compute daily aggregate for domain {}: {}", domain.id, e);
                    }
                }
            }

            // Compute weekly aggregate (once per week on Sunday)
            if now.weekday() == chrono::Weekday::Sun && now.hour() == 0 {
                if let Some(week_end) = now.date_naive().and_hms_opt(0, 0, 0) {
                    let week_end = week_end.and_utc();
                    let week_start = week_end - chrono::Duration::weeks(1);

                    if let Err(e) = queries::compute_uptime_aggregate(
                        &pool,
                        domain.id,
                        week_start,
                        week_end,
                        "week",
                    ).await {
                        eprintln!("Failed to compute weekly aggregate for domain {}: {}", domain.id, e);
                    }
                }
            }
        }

        tracing::info!("Finished computing uptime aggregates");
        Ok(())
    }
}
