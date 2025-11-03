import { bitable } from '@lark-base-open/js-sdk'

class WeReadAPI {
  constructor() {
    this.baseURL = '/api/weread'
    this.defaultHeaders = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    this.cookies = ''
  }

  setCookies(cookies) {
    this.cookies = cookies
  }

  getCookies() {
    return this.cookies
  }

  parseCookieString(cookieString) {
    const cookies = {}
    cookieString.split(';').forEach(item => {
      if (item.trim()) {
        const [name, ...valueParts] = item.trim().split('=')
        const value = valueParts.join('=')
        if (name && value) {
          cookies[name.trim()] = value.trim()
        }
      }
    })
    return cookies
  }

  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeout)

    try {
      const cookieString = this.getCookies()
      if (!cookieString || typeof cookieString !== 'string' || cookieString.trim() === '') {
        throw new Error('Cookie未设置或格式错误')
      }

      const cookies = this.parseCookieString(cookieString)
      
      const fullUrl = url
      console.log('请求URL:', fullUrl)

      const headers = {
        ...this.defaultHeaders,
        ...options.headers,
        'X-Weread-Cookie': cookieString
      };

      console.log('发送请求头:', headers);

      const response = await fetch(fullUrl, {
        ...options,
        signal: controller.signal,
        credentials: 'omit',
        headers: headers
      })
      clearTimeout(id)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return { status: response.status, headers: response.headers, data }
    } catch (error) {
      clearTimeout(id)
      if (error.name === 'AbortError') {
        throw new Error('请求超时')
      }
      throw error
    }
  }

  async getBookshelf() {
    try {
      const cookieString = this.getCookies()
      if (!cookieString || typeof cookieString !== 'string' || cookieString.trim() === '') {
        throw new Error('Cookie未设置或格式错误')
      }
      
      const requiredCookies = ['wr_vid', 'wr_skey', 'wr_rt', 'wr_localvid']
      const cookies = this.parseCookieString(cookieString)
      const missingCookies = requiredCookies.filter(name => !cookies[name])
      
      if (missingCookies.length > 0) {
        throw new Error(`Cookie缺少必要字段: ${missingCookies.join(', ')}`)
      }

      console.log('使用的Cookie对象:', cookies)

      const url = `${this.baseURL}/shelf/sync`
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      const data = response.data
      
      if (!data) {
        throw new Error('服务器返回空数据')
      }

      if (!data.books || !Array.isArray(data.books)) {
        throw new Error('返回数据缺少 books 字段或格式错误')
      }

      if (!data.bookProgress || !Array.isArray(data.bookProgress)) {
        throw new Error('返回数据缺少 bookProgress 字段或格式错误')
      }

      const progressDict = data.bookProgress.reduce((acc, prog) => {
        // 打印原始进度值
        console.log('原始进度值:', {
          bookId: prog.bookId,
          progress: prog.progress,
          type: typeof prog.progress
        });
        
        acc[prog.bookId] = {
          progress: prog.progress || 0,
          readingTime: prog.readingTime || 0
        }
        return acc
      }, {})

      const formattedBooks = data.books.map(book => {
        const progress = progressDict[book.bookId] || { progress: 0, readingTime: 0 }
        // 确保 readingTime 和 progress 是有效的数字
        const readingTime = typeof progress.readingTime === 'number' && !isNaN(progress.readingTime) 
          ? progress.readingTime 
          : 0
        const progressValue = progress.progress;
        
        return {
          bookId: book.bookId,
          title: book.title || '',
          author: book.author || '',
          cover: book.cover || '',
          category: '',
          progress: progressValue,
          readingTime: readingTime,
          primary_category: '',
          secondary_category: '',
          publisher: '',
          publishTime: '',
          intro: '',
          rating: 0
        }
      })

      console.log(`✓ 成功获取书架信息，共 ${formattedBooks.length} 本书`)
      return formattedBooks
    } catch (error) {
      const errorMsg = `获取书架信息失败: ${error.message}`
      console.error(errorMsg, error)
      throw new Error(errorMsg)
    }
  }

  // 获取原始书架数据（不进行格式化）
  async getRawBookshelf() {
    try {
      const cookieString = this.getCookies()
      if (!cookieString || typeof cookieString !== 'string' || cookieString.trim() === '') {
        throw new Error('Cookie未设置或格式错误')
      }
      
      const requiredCookies = ['wr_vid', 'wr_skey', 'wr_rt', 'wr_localvid']
      const cookies = this.parseCookieString(cookieString)
      const missingCookies = requiredCookies.filter(name => !cookies[name])
      
      if (missingCookies.length > 0) {
        throw new Error(`Cookie缺少必要字段: ${missingCookies.join(', ')}`)
      }

      const url = `${this.baseURL}/shelf/sync`
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      const data = response.data
      
      if (!data) {
        alert('调试: 服务器返回空数据\n响应: ' + JSON.stringify(response))
        throw new Error('服务器返回空数据')
      }

      if (!data.books || !Array.isArray(data.books)) {
        alert('调试: 返回数据格式错误\n数据: ' + JSON.stringify(data))
        throw new Error('返回数据缺少 books 字段或格式错误')
      }

      if (!data.bookProgress || !Array.isArray(data.bookProgress)) {
        alert('调试: 返回数据缺少 bookProgress 字段\n数据: ' + JSON.stringify(data))
        throw new Error('返回数据缺少 bookProgress 字段或格式错误')
      }

      return data
    } catch (error) {
      const errorMsg = `获取原始书架信息失败: ${error.message}`
      console.error(errorMsg, error)
      throw new Error(errorMsg)
    }
  }

  async getBookInfo(bookId) {
    try {
      const cookieString = this.getCookies()
      if (!cookieString || typeof cookieString !== 'string' || cookieString.trim() === '') {
        throw new Error('Cookie未设置或格式错误')
      }

      const url = `${this.baseURL}/book/info?bookId=${encodeURIComponent(bookId)}`
      console.log('获取书籍详情URL:', url)
      
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
        headers: {
          ...this.defaultHeaders,
          'X-Weread-Cookie': cookieString
        }
      })

      const bookInfo = response.data
      return {
        category: bookInfo.category || '',
        publisher: bookInfo.publisher || '',
        publishTime: bookInfo.publishTime || '',
        intro: bookInfo.intro || '',
        rating: bookInfo.rating || 0
      }
    } catch (error) {
      const errorMsg = `获取书籍详情失败 (bookId: ${bookId}): ${error.message}`
      console.error(errorMsg, error)
      throw new Error(errorMsg)
    }
  }

  parseCategory(category) {
    if (!category || !category.includes('-')) {
      return [category, '']
    }
    const [primary, secondary] = category.split('-', 2)
    return [primary.trim(), secondary.trim()]
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  formatReadingTime(seconds) {
    if (!seconds || seconds === 0) {
      return '0分钟'
    }
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    let result = ''
    if (hours > 0) {
      result += `${hours}小时`
    }
    if (minutes > 0 || hours === 0) {
      result += `${minutes}分钟`
    }
    return result
  }

  // 移除 formatProgress 函数，不对进度值做任何处理

  // 从本地存储获取进度
  getStoredProgress() {
    try {
      const stored = localStorage.getItem('weread_progress')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('读取进度失败:', error)
      return {}
    }
  }

  // 保存进度到本地存储
  saveProgress(bookId, data) {
    try {
      const progress = this.getStoredProgress()
      progress[bookId] = data
      localStorage.setItem('weread_progress', JSON.stringify(progress))
    } catch (error) {
      console.error('保存进度失败:', error)
    }
  }

  // 清除进度记录
  clearProgress() {
    localStorage.removeItem('weread_progress')
  }

  async getCompleteBookInfo() {
    try {
      const books = await this.getBookshelf()
      const results = []
      
      for (let i = 0; i < books.length; i++) {
        const book = books[i];
        try {
          // 检查是否已经处理过
          const stored = this.getStoredProgress()[book.bookId]
          if (stored) {
            results.push(stored)
            continue
          }

          await this.sleep(2000) // 控制请求频率
          const bookInfo = await this.getBookInfo(book.bookId)
          const [primaryCategory, secondaryCategory] = this.parseCategory(bookInfo.category || '')

          const completeBook = {
            ...book,
            ...bookInfo,
            primary_category: primaryCategory,
            secondary_category: secondaryCategory
          }
          
          // 保存进度
          this.saveProgress(book.bookId, completeBook)
          results.push(completeBook)
          
          // 触发进度回调
          this.onProgress?.(i + 1, books.length, book.title)
        } catch (error) {
          console.error(`处理书籍失败 (${book.bookId}):`, error)
          // 记录失败信息但继续处理其他书籍
          this.saveProgress(book.bookId, { error: error.message, ...book })
        }
      }

      return results
    } catch (error) {
      const errorMsg = `获取完整书籍信息失败: ${error.message}`
      console.error(errorMsg)
      throw new Error(errorMsg)
    }
  }
}

export const wereadAPI = new WeReadAPI()