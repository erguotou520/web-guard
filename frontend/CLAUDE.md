## API生成
使用命令 `npm run sdk:gen` 来更新 api schema。

## API调用
```ts
// 基于fetch封装的client调用
import { client } from '@/api'
import { useRequest } from 'ahooks'

// 可以结合useRequest 一起使用，也可以单独直接使用
const request = useRequest(async () => {
  // 有 get post put 等常见函数
  // 不需要catch，error是boolean 当error = false时有 data
  const { error, data } = await client.get('/api/domains/{id}', {
    // 当路径中有参数时
    params: { id },
    // 当有query参数时
    query: { pageSize: 10, pageNo: 1 },
    // 当有body时
    // body: {}
    // 当body是formdata时
    // body: new FormData()
  })
  if (!error) {
    // 第一个data就已经是response对象本身，第2个data是业务数据
    return data.data
  }
  return null
})
```