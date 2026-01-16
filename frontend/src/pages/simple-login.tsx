export default function SimpleLogin() {
  return (
    <div style={{ padding: '40px', background: '#1a1a1a', minHeight: '100vh', color: 'white' }}>
      <h1>Simple Login Page</h1>
      <form>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <button
          type="submit"
          style={{ padding: '10px 20px', background: '#0f0', color: 'black', border: 'none', cursor: 'pointer' }}
        >
          Login
        </button>
      </form>
    </div>
  )
}
