/**
 * CookieCloud 服务模块
 * 用于从 CookieCloud 服务器获取 Cookie
 */

class CookieCloudAPI {
  /**
   * 从 CookieCloud 获取指定域名的 Cookie
   * @param {string} serverUrl - CookieCloud 服务器地址（如：https://cookiecloud.example.com）
   * @param {string} uuid - CookieCloud 用户 UUID
   * @param {string} password - CookieCloud 密码
   * @param {string} domain - 目标域名（如：weread.qq.com）
   * @returns {Promise<string>} Cookie 字符串
   */
  async getCookie(serverUrl, uuid, password, domain = 'weread.qq.com') {
    try {
      // 清理服务器地址（移除末尾的斜杠）
      const cleanUrl = serverUrl.trim().replace(/\/+$/, '')
      
      // CookieCloud API 格式：
      // method: POST/GET
      // url: /get/:uuid
      // 参数：password（可选，在body或query中）
      
      // 构建API URL
      const apiUrl = `${cleanUrl}/get/${uuid}`
      console.log('请求 CookieCloud API:', apiUrl)
      
      // 先尝试 POST 方式（推荐）
      let response
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            password: password
          })
        })
      } catch (postError) {
        console.log('POST 请求失败，尝试 GET 方式:', postError.message)
        // 如果POST失败，尝试GET方式
        const getUrl = `${apiUrl}?password=${encodeURIComponent(password)}`
        response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        })
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => '无法读取响应内容')
        console.error('CookieCloud API 响应错误:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        
        if (response.status === 404) {
          throw new Error('CookieCloud API 路径不存在，请检查服务器地址和UUID是否正确')
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('UUID 或密码错误')
        } else if (response.status === 400) {
          throw new Error('请求参数错误: ' + errorText.substring(0, 100))
        } else {
          throw new Error(`CookieCloud 服务器返回错误 (${response.status}): ${errorText.substring(0, 100)}`)
        }
      }

      const data = await response.json()
      console.log('CookieCloud 响应数据:', data)
      
      return this._parseCookieData(data, domain)

    } catch (error) {
      console.error('从 CookieCloud 获取 Cookie 失败:', error)
      
      if (error.message) {
        throw error
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('无法连接到 CookieCloud 服务器，请检查服务器地址是否正确（可能是CORS问题）')
      } else {
        throw new Error(`获取 Cookie 失败: ${error.message || '未知错误'}`)
      }
    }
  }

  /**
   * 解析 CookieCloud 返回的数据
   * @private
   */
  _parseCookieData(data, domain) {
    if (!data) {
      throw new Error('CookieCloud 返回数据为空')
    }
    
    // 检查返回格式
    if (data.code !== undefined && data.code !== 0) {
      throw new Error(data.message || 'CookieCloud 返回错误，code: ' + data.code)
    }

    // CookieCloud 返回格式可能是：
    // 1. { cookie_data: { [domain]: [cookie1, cookie2, ...] }, ... }
    // 2. { code: 0, data: { [domain]: [cookie1, cookie2, ...] } }
    // 3. 直接是 { [domain]: [cookie1, cookie2, ...] }
    
    let cookieData = null
    
    // 优先从 cookie_data 字段获取
    if (data.cookie_data && typeof data.cookie_data === 'object') {
      cookieData = data.cookie_data
      console.log('从 cookie_data 字段获取数据')
    } 
    // 其次从 data 字段获取
    else if (data.data && typeof data.data === 'object') {
      cookieData = data.data
      console.log('从 data 字段获取数据')
    } 
    // 最后直接使用 data
    else if (typeof data === 'object') {
      cookieData = data
      console.log('直接使用返回的数据')
    }
    
    if (!cookieData || typeof cookieData !== 'object') {
      throw new Error('CookieCloud 返回数据格式错误，无法找到 cookie 数据')
    }
    
    console.log('CookieCloud 数据键:', Object.keys(cookieData))
    
    // 查找指定域名的数据
    let targetCookies = null
    let foundDomain = null
    
    // 直接匹配域名
    if (cookieData[domain]) {
      targetCookies = cookieData[domain]
      foundDomain = domain
    } else {
      // 尝试查找包含该域名的键（可能是 .qq.com 或 weread.qq.com）
      const domainKeys = Object.keys(cookieData).filter(key => {
        // 跳过非域名键（如 cookie_data, local_storage_data, update_time 等）
        if (['cookie_data', 'local_storage_data', 'update_time', 'data', 'code', 'message'].includes(key)) {
          return false
        }
        return key.includes(domain) || domain.includes(key.replace(/^\./, ''))
      })
      
      if (domainKeys.length > 0) {
        foundDomain = domainKeys[0]
        targetCookies = cookieData[foundDomain]
        console.log(`使用匹配的域名: ${foundDomain}`)
      }
    }
    
    if (!targetCookies) {
      // 列出所有可能的域名键
      const domainKeys = Object.keys(cookieData).filter(key => 
        !['cookie_data', 'local_storage_data', 'update_time', 'data', 'code', 'message'].includes(key)
      )
      console.error('可用域名键:', domainKeys)
      throw new Error(`CookieCloud 中未找到域名 ${domain} 的 Cookie 数据。可用域名: ${domainKeys.length > 0 ? domainKeys.join(', ') : '无'}`)
    }
    
    // 确保 cookies 是数组
    if (!Array.isArray(targetCookies)) {
      throw new Error(`域名 ${foundDomain || domain} 的 Cookie 数据格式错误，期望数组但得到: ${typeof targetCookies}`)
    }
    
    if (targetCookies.length === 0) {
      throw new Error(`域名 ${foundDomain || domain} 的 Cookie 数据为空`)
    }

    // 将 Cookie 数组转换为字符串格式
    // Cookie 格式: { name: 'xxx', value: 'yyy', domain: '...', ... }
    const cookieString = targetCookies
      .map(cookie => {
        if (typeof cookie === 'string') {
          // 如果已经是字符串格式，直接使用
          return cookie
        } else if (cookie && typeof cookie === 'object') {
          // 如果是对象，转换为 name=value 格式
          if (cookie.name && cookie.value !== undefined) {
            return `${cookie.name}=${cookie.value}`
          } else {
            // 可能是其他格式，尝试序列化
            console.warn('未知的 cookie 格式:', cookie)
            return null
          }
        } else {
          return null
        }
      })
      .filter(cookie => cookie !== null)
      .join('; ')

    if (!cookieString) {
      throw new Error(`无法解析域名 ${foundDomain || domain} 的 Cookie 数据`)
    }

    console.log(`成功从 CookieCloud 获取 Cookie（域名: ${foundDomain || domain}），长度:`, cookieString.length)
    return cookieString
  }

  /**
   * 测试 CookieCloud 连接
   * @param {string} serverUrl - CookieCloud 服务器地址
   * @param {string} uuid - CookieCloud 用户 UUID
   * @param {string} password - CookieCloud 密码
   * @returns {Promise<{success: boolean, message?: string}>} 连接测试结果
   */
  async testConnection(serverUrl, uuid, password) {
    try {
      await this.getCookie(serverUrl, uuid, password, 'weread.qq.com')
      return { success: true }
    } catch (error) {
      console.error('CookieCloud 连接测试失败:', error)
      return { 
        success: false, 
        message: error.message || '连接测试失败'
      }
    }
  }
}

export const cookieCloudAPI = new CookieCloudAPI()


