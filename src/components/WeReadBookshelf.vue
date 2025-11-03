<template>
  <div class="weread-bookshelf">
    <!-- 插件说明 -->
    <div class="plugin-intro">
      <h2>微信读书同步助手</h2>
      <p>本插件可以帮助你将微信读书的书架数据同步到飞书多维表格中，方便整理和管理你的阅读记录。使用前请先点击"设置"按钮配置微信读书 Cookie。</p>
    </div>

    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 搜索框 -->
      <div class="search-group" v-if="hasCookie && books.length > 0">
        <el-input
          v-model="searchKeyword"
          placeholder="输入bookId或书名搜索"
          class="search-input"
          clearable
          @clear="clearSearch"
        >
          <template #append>
            <el-select v-model="searchType" style="width: 100px">
              <el-option label="bookId" value="bookId" />
              <el-option label="书名" value="title" />
            </el-select>
          </template>
        </el-input>
      </div>
      
      <div class="action-group" v-if="hasCookie">
        <div class="action-buttons-row">
          <el-button 
            class="action-btn action-equal"
            type="primary" 
            @click="updateBookshelfWithDetection" 
            :loading="loading"
          >
            <template #icon><el-icon><Refresh /></el-icon></template>
            同步书架
          </el-button>
          
          <el-button 
            class="action-btn action-equal"
            type="info" 
            @click="syncFromTable" 
            :loading="loading"
          >
            <template #icon><el-icon><Download /></el-icon></template>
            同步表格
          </el-button>
          
          <el-button 
            class="action-btn action-equal"
            type="warning" 
            :disabled="!hasNewBooks"
            @click="updateNewBooksToTable" 
            :loading="loading"
          >
            <template #icon><el-icon><Plus /></el-icon></template>
            更新表格
          </el-button>
          
          <el-button 
            class="action-btn action-narrow"
            :type="hasCookie ? 'default' : 'primary'"
            @click="showSettingsDialog"
          >
            <template #icon><el-icon><Tools /></el-icon></template>
            设置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 书架内容 -->
    <div v-if="hasCookie && books.length > 0">
      <!-- 分页信息 -->
      <div v-if="paginatedBooks.length > 0" class="pagination-info">
        <span>共 {{ totalBooks }} 本书，当前显示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalBooks) }} 本</span>
      </div>
      
      <div class="books-list">
        <div v-for="book in paginatedBooks" :key="book.bookId" class="book-card">
        <div class="book-info">
          <img :src="book.cover" :alt="book.title" class="book-cover">
          <div class="book-details">
            <div class="book-header">
              <div class="title-row">
                <h3>{{ book.title }}</h3>
              </div>
              <!-- <div class="author-row">
                <span>{{ book.author }}</span>
              </div> -->
              <div class="update-row">
                <el-button 
                  type="primary" 
                  size="small" 
                  link
                  class="update-btn"
                  @click="updateBookProgress(book)"
                  :loading="book.updating"
                >
                  <template #icon><el-icon><Refresh /></el-icon></template>
                  更新进度
                </el-button>
              </div>
            </div>

            <div class="book-meta">
              <div class="meta-row">
                <span class="label">进度</span>
                <span class="value">{{ book.progress }}%</span>
              </div>
              <div class="meta-row">
                <span class="label">阅读时长</span>
                <span class="value">{{ formatDisplayReadingTime(book.readingTime) }}</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <!-- 分页组件 -->
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100, 200]"
          :total="totalBooks"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 空状态提示 -->
    <div v-if="hasCookie && !books.length && !loading" class="empty-state">
      <el-empty description="暂无书籍数据，点击同步按钮获取" />
    </div>

    <!-- 搜索无结果提示 -->
    <div v-if="hasCookie && books.length > 0 && searchKeyword && !displayBooks.length" class="empty-state">
      <el-empty description="未找到匹配的书籍" />
    </div>

    <!-- Cookie设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="设置"
      width="90%"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      class="settings-dialog"
    >
      <el-tabs v-model="cookieSourceType" @tab-change="handleSourceTypeChange" class="settings-tabs">
        <el-tab-pane label="手动输入" name="manual">
          <el-form label-position="top" class="settings-form">
            <el-form-item label="微信读书 Cookie">
              <el-input
                v-model="cookieInput"
                type="textarea"
                :rows="4"
                placeholder="请输入微信读书 Cookie"
              />
              <div class="form-tips">
                提示：Cookie 可以从微信读书网页版获取
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        
        <el-tab-pane label="CookieCloud" name="cookiecloud">
          <el-form label-position="top" class="settings-form">
            <el-row :gutter="12">
              <el-col :xs="24" :sm="24" :md="24">
                <el-form-item label="服务器地址">
                  <el-input
                    v-model="cookiecloudConfig.serverUrl"
                    placeholder="例如：https://cookiecloud.example.com"
                    clearable
                  />
                  <div class="form-tips">
                    请输入 CookieCloud 服务器地址（不含末尾斜杠）
                  </div>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="12">
                <el-form-item label="UUID">
                  <el-input
                    v-model="cookiecloudConfig.uuid"
                    placeholder="请输入 CookieCloud UUID"
                    clearable
                  />
                  <div class="form-tips">
                    请输入 CookieCloud 用户 UUID
                  </div>
                </el-form-item>
              </el-col>
              <el-col :xs="24" :sm="12" :md="12">
                <el-form-item label="密码">
                  <el-input
                    v-model="cookiecloudConfig.password"
                    type="password"
                    placeholder="请输入 CookieCloud 密码"
                    show-password
                    clearable
                  />
                  <div class="form-tips">
                    请输入 CookieCloud 端对端加密密码
                  </div>
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item>
              <div class="settings-actions">
                <el-button 
                  type="primary" 
                  @click="fetchCookieFromCloud" 
                  :loading="fetchingCookie"
                  :disabled="!cookiecloudConfig.serverUrl || !cookiecloudConfig.uuid || !cookiecloudConfig.password"
                >
                  <template #icon><el-icon><Download /></el-icon></template>
                  从 CookieCloud 获取 Cookie
                </el-button>
                <el-button 
                  @click="testCookieCloudConnection" 
                  :loading="testingConnection"
                  :disabled="!cookiecloudConfig.serverUrl || !cookiecloudConfig.uuid || !cookiecloudConfig.password"
                >
                  测试连接
                </el-button>
              </div>
            </el-form-item>
            <el-form-item v-if="cookieFromCloud" label="获取到的 Cookie">
              <el-input
                v-model="cookieInput"
                type="textarea"
                :rows="4"
                readonly
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showSettings = false" v-if="hasCookie">取消</el-button>
          <el-button type="primary" @click="setCookie" :loading="loading" :disabled="!cookieInput">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 进度提示 -->
    <div v-if="syncProgress" class="sync-progress">
      {{ syncProgress }}
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-loading :fullscreen="true" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Refresh, Upload, Delete, Tools, RefreshRight, Plus, Download } from '@element-plus/icons-vue'
import { bitable } from '@lark-base-open/js-sdk'
import { wereadAPI } from '../services/weread'
import { cookieCloudAPI } from '../services/cookiecloud'

const loading = ref(false)
const syncProgress = ref('')
const books = ref([])
const cookieInput = ref('')
const hasCookie = ref(false)
const showSettings = ref(false)

// CookieCloud 相关状态
const cookieSourceType = ref('manual') // 'manual' 或 'cookiecloud'
const cookiecloudConfig = ref({
  serverUrl: '',
  uuid: '',
  password: ''
})
const fetchingCookie = ref(false)
const testingConnection = ref(false)
const cookieFromCloud = ref(false)

// 搜索相关变量
const searchKeyword = ref('')
const searchType = ref('bookId')
const filteredBooks = ref([])

// 分页相关变量
const currentPage = ref(1)
const pageSize = ref(10) // 默认每页显示10本

// 存储上一次的bookId列表和新增书籍ID列表
const previousBookIds = ref(new Set())
const newBookIds = ref([])

// 存储新增的书籍对象
const newBooks = ref([])

// 计算属性：是否有新增书籍
const hasNewBooks = computed(() => {
  return newBookIds.value.length > 0
})

// 计算属性：过滤后的书籍列表（用于搜索）
const filteredBooksList = computed(() => {
  if (!searchKeyword.value.trim()) {
    return books.value
  }
  
  const keyword = searchKeyword.value.trim().toLowerCase()
  
  if (searchType.value === 'bookId') {
    return books.value.filter(book => 
      book.bookId && book.bookId.toString().toLowerCase().includes(keyword)
    )
  } else {
    return books.value.filter(book => 
      book.title && book.title.toLowerCase().includes(keyword)
    )
  }
})

// 计算属性：总书籍数（用于分页）
const totalBooks = computed(() => {
  return filteredBooksList.value.length
})

// 计算属性：总页数
const totalPages = computed(() => {
  return Math.ceil(totalBooks.value / pageSize.value)
})

// 计算属性：分页后的书籍列表（实际显示的书籍）
const paginatedBooks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredBooksList.value.slice(start, end)
})

// 兼容 displayBooks（用于搜索无结果提示）
const displayBooks = computed(() => {
  return filteredBooksList.value
})

// 分页处理函数
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1 // 改变每页数量时重置到第一页
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1 // 清除搜索时重置到第一页
}

// 监听搜索关键词变化，自动重置到第一页
watch(searchKeyword, () => {
  currentPage.value = 1
})

// 调试提示：仅在关键节点弹框，避免无限弹窗
const debugAlert = (text) => {
  try { console.log(text) } catch (_) {}
  try { /* 如需开启所有弹窗，将下行解除注释 */ /* alert(String(text)) */ } catch (_) {}
}

// 读取表格中的所有 bookid，返回 Set<string>
const getTableBookIds = async () => {
  try {
    const table = await bitable.base.getActiveTable()
    if (!table) return new Set()
    
    // 统一通过 helper 获取所有记录
    const allRecords = await fetchAllRecords(table)

    if (!allRecords || allRecords.length === 0) return new Set()

    // 尝试找到名为 'bookid' 的字段 id
    const fieldMetas = await table.getFieldMetaList()
    const bookidField = fieldMetas.find(f => f.name === 'bookid')
    if (!bookidField) return new Set()
    const bookidFieldId = bookidField.id

    const ids = new Set()
    for (const rec of allRecords) {
      const raw = getRecordFieldValue(rec, bookidFieldId)
      if (raw != null) {
        const text = extractTextFromRichText(raw)
        ids.add((text || '').trim())
      }
    }
    return ids
  } catch (e) {
    console.warn('读取表格 bookid 失败:', e)
    return new Set()
  }
}

// Helper：尽可能获取表格中所有记录，使用 SDK 提供的正确方法
const fetchAllRecords = async (table) => {
  const collected = []
  const collectedIds = new Set() // 用于去重，基于 recordId
  
  // 策略一：直接使用 table.getRecordsByPage 分页获取所有记录（返回 IRecord[]，包含 recordId）
  try {
    console.log('使用 SDK 方法：分页获取所有记录...')
    
    let pageToken = null // PageToken 是 number 类型
    let hasMore = true
    const pageSize = 200 // 根据 SDK 文档，单次上限为 200
    
    while (hasMore) {
      try {
        const params = { pageSize }
        if (pageToken !== null && pageToken !== undefined) {
          params.pageToken = pageToken
        }
        
        // 直接使用 table.getRecordsByPage，返回 IRecord[]（包含 recordId 和 fields）
        const response = await table.getRecordsByPage(params)
        const data = response instanceof Promise ? await response : response
        
        if (!data || !data.records || !Array.isArray(data.records)) {
          console.log('获取记录失败或格式不正确:', data)
          break
        }
        
        const batch = data.records
        
        // 去重：只添加新的记录
        let newCount = 0
        for (const rec of batch) {
          if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
            collectedIds.add(rec.recordId)
            collected.push(rec)
            newCount++
          }
        }
        
        console.log(`分页获取：本次 ${batch.length} 条（新增 ${newCount} 条），累计 ${collected.length} 条，hasMore: ${data.hasMore}, pageToken: ${data.pageToken}`)
        
        // 检查是否还有更多
        hasMore = data.hasMore === true
        
        if (data.pageToken !== null && data.pageToken !== undefined) {
          pageToken = data.pageToken
          // 如果有 pageToken，继续获取
          hasMore = true
        } else {
          // 没有 pageToken，说明已到底
          hasMore = false
        }
        
        // 如果返回的记录数少于 pageSize，说明已到底
        if (batch.length < pageSize) {
          hasMore = false
        }
        
        // 如果本次没有新增记录，说明可能有重复，停止获取
        if (newCount === 0 && batch.length > 0) {
          console.log('检测到重复数据，停止获取')
          hasMore = false
          break
        }
        
      } catch (e) {
        console.log(`分页获取记录失败:`, e)
        hasMore = false
        break
      }
    }
    
    if (collected.length > 0) {
      console.log(`通过 SDK 方法获取完成，共 ${collected.length} 条（已去重）`)
      return collected
    }
  } catch (e) {
    console.log('SDK 方法获取失败，尝试备用方案:', e)
  }
  
  // 备用策略：如果 SDK 方法失败，使用原来的方法
  const pageSize = 200 // 大多数 SDK 单次上限为 200
  let pageToken = null
  let pageNum = 1
  let hasMore = true
  let prevTotal = 0
  const MAX_TOTAL_SAFE_GUARD = 5000

  // 尝试策略一：使用 pageToken/hasMore
  try {
    while (hasMore) {
      const params = { pageSize }
      if (pageToken) params.pageToken = pageToken
      const response = await table.getRecordList(params)
      const data = response instanceof Promise ? await response : response
      if (!data) break
      let batch = []
      if (data.recordList && Array.isArray(data.recordList)) batch = data.recordList
      else if (Array.isArray(data)) batch = data
      else break
      
      // 去重：只添加新的记录
      let newCount = 0
      for (const rec of batch) {
        if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
          collectedIds.add(rec.recordId)
          collected.push(rec)
          newCount++
        }
      }
      // 仅记录日志，不弹窗
      console.log(`分页获取：本次 ${batch.length} 条（新增 ${newCount} 条），累计 ${collected.length} 条`)
      
      // 如果本次没有新增记录，说明可能有重复，停止获取
      if (newCount === 0 && batch.length > 0) {
        console.log('检测到重复数据，停止获取')
        hasMore = false
        break
      }
      
      // 检查是否有下一页的多种方式
      if (data.hasMore === true) {
        if (data.pageToken) {
          pageToken = data.pageToken
          hasMore = true
        } else {
          // 有 hasMore 但无 pageToken，尝试继续
          hasMore = batch.length >= pageSize
        }
      } else if (data.pageToken && data.pageToken !== pageToken) {
        pageToken = data.pageToken
        hasMore = true
      } else if (batch.length >= pageSize) {
        // 返回的记录数等于 pageSize，可能还有更多，尝试继续
        hasMore = true
        // 尝试增加偏移量或使用其他方式
        if (!pageToken) {
          // 没有 pageToken，尝试使用页码或其他方式
          hasMore = false // 先停止，让后面的页码逻辑处理
        }
      } else {
        // 返回的记录数少于 pageSize，说明已到底
        hasMore = false
      }
      if (collected.length >= 200000) break
    }
    // 如果没有 pageToken/hasMore，但首批刚好等于 pageSize，则尝试基于页码继续拉取
    if (collected.length > 0) {
      if (collected.length % pageSize === 0) {
        console.log(`已获取 ${collected.length} 条，尝试使用多种方式继续获取...`)
        pageNum = Math.floor(collected.length / pageSize) + 1
        
        // 连续尝试多种页码参数名和偏移量方式
        while (true) {
          let got = []
          let ok = false
          
          // 尝试多种参数组合
          const tryParamsList = [
            { pageSize, pageNum },
            { pageSize, page: pageNum },
            { pageSize, page_number: pageNum },
            { pageSize, offset: collected.length },
            { pageSize, startIndex: collected.length },
            { pageSize, skip: collected.length },
            // 尝试不使用 pageSize，只使用页码
            { pageNum },
            { page: pageNum }
          ]
          
          for (const p of tryParamsList) {
            try {
              const resp = await table.getRecordList(p)
              const d = resp instanceof Promise ? await resp : resp
              if (d?.recordList && Array.isArray(d.recordList)) {
                got = d.recordList
                ok = true
                console.log(`参数 ${JSON.stringify(p)} 成功获取到 ${got.length} 条`)
                break
              } else if (Array.isArray(d)) {
                got = d
                ok = true
                console.log(`参数 ${JSON.stringify(p)} 成功获取到 ${got.length} 条`)
                break
              }
            } catch (e) {
              console.log(`参数 ${JSON.stringify(p)} 失败:`, e.message)
            }
          }
          
          if (!ok) {
            console.log('所有分页参数尝试失败，可能已获取全部数据或 API 不支持分页')
            break
          }
          
          if (!got || got.length === 0) {
            console.log('获取到 0 条记录，停止获取')
            break
          }
          
          // 去重：只添加新的记录
          let newCount = 0
          for (const rec of got) {
            if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
              collectedIds.add(rec.recordId)
              collected.push(rec)
              newCount++
            }
          }
          
          console.log(`页码获取：第 ${pageNum} 页，本次 ${got.length} 条（新增 ${newCount} 条），累计 ${collected.length} 条`)
          
          // 如果本次没有新增记录，说明 API 不支持页码分页或已到底，停止
          if (newCount === 0 && got.length > 0) {
            console.log('页码获取检测到重复数据，停止获取')
            break
          }
          
          // 如果获取到的记录数少于 pageSize，说明已到底
          if (got.length < pageSize) {
            console.log(`获取到的记录数 ${got.length} 少于 pageSize ${pageSize}，停止获取`)
            break
          }
          
          pageNum += 1
          if (pageNum > 1000) {
            console.log('页码超过1000，停止获取')
            break
          }
          
          // 防护：若总数未增长，退出
          if (collected.length === prevTotal) {
            console.log('总数未增长，停止获取')
            break
          }
          prevTotal = collected.length
          
          // 防护：超过安全上限，避免无限循环
          if (collected.length >= MAX_TOTAL_SAFE_GUARD) {
            console.log('超过安全上限，停止获取')
            break
          }
        }
      }
      console.log(`分页获取完成，共 ${collected.length} 条（已去重）`)
      return collected
    }
  } catch (_) {}

  // 策略二：使用 pageNum（部分 SDK 兼容）
  try {
    pageNum = 1
    while (true) {
      const response = await table.getRecordList({ pageSize, pageNum })
      const data = response instanceof Promise ? await response : response
      if (!data) break
      let batch = []
      if (data.recordList && Array.isArray(data.recordList)) batch = data.recordList
      else if (Array.isArray(data)) batch = data
      else break
      if (!batch.length) break
      
      // 去重：只添加新的记录
      let newCount = 0
      for (const rec of batch) {
        if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
          collectedIds.add(rec.recordId)
          collected.push(rec)
          newCount++
        }
      }
      
      console.log(`页码获取：第 ${pageNum} 页，本次 ${batch.length} 条（新增 ${newCount} 条），累计 ${collected.length} 条`)
      
      // 如果本次没有新增记录，停止获取
      if (newCount === 0 && batch.length > 0) {
        console.log('策略二检测到重复数据，停止获取')
        break
      }
      
      if (batch.length < pageSize) break
      pageNum += 1
      if (pageNum > 1000) break
      if (collected.length === prevTotal) break
      prevTotal = collected.length
      if (collected.length >= MAX_TOTAL_SAFE_GUARD) break
    }
    if (collected.length > 0) {
      console.log(`页码获取完成，共 ${collected.length} 条`)
      return collected
    }
  } catch (_) {}

  // 策略三：通过记录 ID 列表分批获取
  // 先尝试获取所有记录的 ID（只获取 ID，不获取完整数据）
  try {
    console.log('尝试策略四：通过记录 ID 列表获取...')
    
    // 先获取所有记录的 ID（通过多次调用 getRecordList，只取 ID）
    const allRecordIds = new Set()
    let idFetchPageToken = null
    let idFetchPageNum = 1
    const idPageSize = 500 // 获取 ID 时可以用更大的 pageSize
    
    // 获取所有 recordId
    while (true) {
      let idBatch = []
      try {
        const idParams = { pageSize: idPageSize }
        if (idFetchPageToken) idParams.pageToken = idFetchPageToken
        else if (idFetchPageNum > 1) {
          // 尝试多种页码参数
          const tryIdParams = [
            { pageSize: idPageSize, pageNum: idFetchPageNum },
            { pageSize: idPageSize, page: idFetchPageNum },
            { pageSize: idPageSize, offset: (idFetchPageNum - 1) * idPageSize }
          ]
          let found = false
          for (const p of tryIdParams) {
            try {
              const idResp = await table.getRecordList(p)
              const idData = idResp instanceof Promise ? await idResp : idResp
              if (idData?.recordList) idBatch = idData.recordList
              else if (Array.isArray(idData)) idBatch = idData
              if (idBatch.length > 0) {
                found = true
                break
              }
            } catch (_) {}
          }
          if (!found && idFetchPageNum === 1) {
            // 第一页，直接用默认参数
            const idResp = await table.getRecordList()
            const idData = idResp instanceof Promise ? await idResp : idResp
            if (idData?.recordList) idBatch = idData.recordList
            else if (Array.isArray(idData)) idBatch = idData
          }
          if (!found && idBatch.length === 0) break
        } else {
          const idResp = await table.getRecordList(idParams)
          const idData = idResp instanceof Promise ? await idResp : idResp
          if (idData?.recordList) idBatch = idData.recordList
          else if (Array.isArray(idData)) idBatch = idData
          if (idData?.pageToken) idFetchPageToken = idData.pageToken
        }
      } catch (e) {
        console.log(`获取 ID 列表失败:`, e)
        break
      }
      
      if (!idBatch || idBatch.length === 0) break
      
      // 收集所有 recordId
      for (const rec of idBatch) {
        if (rec && rec.recordId) {
          allRecordIds.add(rec.recordId)
        }
      }
      
      console.log(`已收集 ${allRecordIds.size} 个记录 ID...`)
      
      // 如果获取到的 ID 数少于 pageSize，说明已到底
      if (idBatch.length < idPageSize) break
      
      if (idFetchPageToken) {
        idFetchPageNum++
      } else {
        idFetchPageNum++
        // 如果没有 pageToken，只能通过页码继续
        // 但如果页码获取失败或重复，停止
        if (idFetchPageNum > 100) break // 限制最多100页
      }
    }
    
    console.log(`共收集到 ${allRecordIds.size} 个记录 ID，开始通过 ID 获取完整记录...`)
    
    // 将 ID 转换为数组并分批处理
    const recordIdArray = Array.from(allRecordIds)
    const batchSize = 200 // 每次通过 ID 获取 200 条
    
    // 尝试使用批量获取方法
    for (let i = 0; i < recordIdArray.length; i += batchSize) {
      const idBatch = recordIdArray.slice(i, i + batchSize)
      
      try {
        // 尝试使用 getRecordsByIds（如果支持）
        let batchRecords = []
        if (typeof table.getRecordsByIds === 'function') {
          const batchResp = await table.getRecordsByIds(idBatch)
          batchRecords = batchResp instanceof Promise ? await batchResp : batchResp
          if (Array.isArray(batchRecords)) {
            // 成功获取
            for (const rec of batchRecords) {
              if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
                collectedIds.add(rec.recordId)
                collected.push(rec)
              }
            }
            console.log(`通过 getRecordsByIds 获取第 ${Math.floor(i/batchSize) + 1} 批，${batchRecords.length} 条，累计 ${collected.length} 条`)
            continue
          }
        }
        
        // 如果不支持批量获取，逐个获取
        for (const recordId of idBatch) {
          try {
            if (typeof table.getRecordById === 'function') {
              const rec = await table.getRecordById(recordId)
              const record = rec instanceof Promise ? await rec : rec
              if (record && record.recordId && !collectedIds.has(record.recordId)) {
                collectedIds.add(record.recordId)
                collected.push(record)
              }
            }
          } catch (_) {}
        }
        
        console.log(`通过 ID 获取第 ${Math.floor(i/batchSize) + 1} 批，累计 ${collected.length} 条`)
        
      } catch (e) {
        console.log(`通过 ID 获取第 ${Math.floor(i/batchSize) + 1} 批失败:`, e.message)
      }
    }
    
    if (collected.length > 0) {
      console.log(`通过 ID 列表获取完成，共 ${collected.length} 条`)
      return collected
    }
  } catch (e) {
    console.log('策略四（ID 列表）失败:', e)
  }

  // 策略四：不带参数一次性获取（可能有限制）
  try {
    const response = await table.getRecordList()
    const data = response instanceof Promise ? await response : response
    let batch = []
    if (data?.recordList && Array.isArray(data.recordList)) {
      batch = data.recordList
    } else if (Array.isArray(data)) {
      batch = data
    }
    
    // 去重并返回
    const result = []
    for (const rec of batch) {
      if (rec && rec.recordId && !collectedIds.has(rec.recordId)) {
        collectedIds.add(rec.recordId)
        result.push(rec)
      }
    }
    
    if (result.length > 0) {
      console.log(`一次性获取 ${batch.length} 条（去重后 ${result.length} 条）`)
      return result
    }
  } catch (_) {}

  return collected
}

// 更新书单并监测新增书籍
const updateBookshelfWithDetection = async () => {
  try {
    loading.value = true
    syncProgress.value = '正在获取书架数据...'
    
    // 获取书架列表（包含进度信息，但不需要详细信息）
    const bookList = await wereadAPI.getBookshelf()
    
    // 安全检查：确保bookList存在且是数组
    if (!bookList || !Array.isArray(bookList)) {
      throw new Error('获取书籍列表失败')
    }
    
    // 提取当前bookId列表（统一转为字符串）
    const currentBookIds = new Set(
      bookList.map(book => String(book.bookId))
    )

    // 如果还没有基线（previousBookIds 为空），根据表格建立基线
    if (previousBookIds.value.size === 0) {
      const tableIds = await getTableBookIds()
      if (tableIds.size === 0) {
        // 表格为空：首次使用场景① -> 逐本获取详情并立即写入
        // 不要一次性获取所有信息，而是逐本处理
        ElMessage.info('首次同步检测到大量书籍，将逐本写入表格，请耐心等待...')
        
        // 直接调用 writeToTable 函数，它会逐本获取详情并立即写入
        books.value = bookList.map(b => ({ ...b, updating: false }))
        
        try {
          await writeToTable()
          previousBookIds.value = new Set(currentBookIds)
          newBookIds.value = []
          newBooks.value = []
        } catch (e) {
          console.error('首次写入表格失败:', e)
          // 如果是中断，用户下次点击"同步书架"将自动继续未完成的部分
          ElMessage.warning(`写入过程中断，已写入部分数据，下次点击"同步书架"将自动继续未完成的部分`)
          // 不清空 books.value，保留状态供断点续写
          throw e
        }
        return
      }
      // 表格有数据但 previousBookIds 为空：建立基线为表格，进入新增检测
      previousBookIds.value = tableIds
    }

    {
      // 找出新增的bookId（在微信读书中新增，但不在表格中的书籍）
      const newIds = []
      for (const bookId of currentBookIds) {
        if (!previousBookIds.value.has(bookId)) {
          newIds.push(bookId)
        }
      }
      
      // 如果有新增书籍，保存新增书籍信息
      if (newIds.length > 0) {
        // 保存新增书籍ID（统一为字符串）
        newBookIds.value = newIds
        const newIdSet = new Set(newIds.map(id => String(id)))
        // 过滤新增书籍时，统一将 bookId 转字符串再比对
        const newBooksData = bookList.filter(book => {
          const comparable = String(book.bookId)
          return newIdSet.has(comparable)
        })
        console.log('📚 新增书籍:', newBooksData.map(book => `${book.title} (${book.bookId})`))
        console.log('新增书籍IDs:', newBookIds.value)
        ElMessage.success(`发现 ${newBookIds.value.length} 本新书`)
        
        // 保存新增书籍的基础信息（不获取详细信息）
        newBooks.value = newBooksData.map(book => ({
          ...book,
          primary_category: '',
          secondary_category: '',
          intro: '',
          rating: 0
        }))
      } else {
        newBookIds.value = []
        newBooks.value = []
        ElMessage.success(`成功获取 ${bookList.length} 本书的信息（无新增书籍）`)
      }
    }
    
    // 仅在有新增时，将新增书籍追加到前端现有列表；不要用全量书架覆盖
    if (newBooks.value.length > 0) {
      // 现有列表的 ID 也统一转字符串进行去重
      const existingIds = new Set(
        books.value.map(b => String(b.bookId))
      )
      const toAppend = newBooks.value
        .map(b => ({ ...b, updating: false }))
        .filter(b => {
          const key = String(b.bookId)
          return !existingIds.has(key)
        })
      if (toAppend.length > 0) {
        books.value = [...books.value, ...toAppend]
      }
    }
    
  } catch (error) {
    ElMessage.error('获取书架失败：' + error.message)
  } finally {
    loading.value = false
    syncProgress.value = ''
  }
}

// 更新单本书的进度
const updateBookProgress = async (book) => {
  try {
    book.updating = true
    
    // 重新获取所有书籍的进度信息
    const allBooks = await wereadAPI.getBookshelf()
    
    // 找到当前书籍的最新进度信息（统一类型进行比对）
    const currentIdComparable = String(book.bookId)
    const updatedBook = allBooks.find(b => {
      const bIdComparable = String(b.bookId)
      return bIdComparable === currentIdComparable
    })
    
    if (updatedBook) {
      // 只更新进度和阅读时长
      book.progress = updatedBook.progress
      book.readingTime = updatedBook.readingTime
      
      // 保存到本地存储
      wereadAPI.saveProgress(book.bookId, book)

      try {
        // 获取当前表格
        const table = await bitable.base.getActiveTable()
        if (!table) {
          throw new Error('未能获取到当前表格')
        }

        // 获取字段（只获取需要更新的字段）
        const fields = {}
        const fieldConfigs = [
          { name: 'bookid', type: 1 },      // 用于查找记录 (Text类型)
          { name: '书名', type: 1 },        // 回退匹配使用
          { name: '阅读进度', type: 2 },    // 需要更新
          { name: '阅读时长', type: 1 },    // 需要更新
          { name: '是否读完', type: 4 }     // 需要更新
        ]

        // 获取现有字段列表
        const existingFields = await table.getFieldMetaList()
        
        // 获取所需字段
        for (const config of fieldConfigs) {
          const existingField = existingFields.find(f => f.name === config.name)
          if (existingField) {
            fields[config.name] = await table.getField(config.name)
          } else {
            throw new Error(`未找到字段：${config.name}`)
          }
        }

        // 查询匹配的记录
        // bookId 作为字符串进行比较（去除空白）
        const targetBookId = String(book.bookId).trim()
        console.log('正在查找书籍，bookId:', targetBookId)
        
        // 获取所有记录（整表），避免只拿到第一页
        let records;
        try {
          records = await fetchAllRecords(table)
          if (!Array.isArray(records)) {
            throw new Error('未获取到记录数据')
          }
        } catch (error) {
          console.error('获取表格记录失败:', error)
          throw new Error(`获取表格记录失败：${error.message}`)
        }
        
        // 获取 bookid 字段的 ID
        const bookidFieldId = fields['bookid'].id
        // console.log('bookid 字段 ID: ' + bookidFieldId)
        
        // 查找匹配的记录（表格中的 bookid 为文本/富文本，需提取纯文本并去空白）
        let matchingRecords = records.filter(record => {
          if (!record) return false
          const raw = getRecordFieldValue(record, bookidFieldId)
          const recordBookIdText = extractTextFromRichText(raw)?.trim()
          return recordBookIdText === targetBookId
        })

        // 回退：若通过 bookid 未匹配到，尝试用书名精确匹配
        if ((!matchingRecords || matchingRecords.length === 0) && fields['书名']) {
          const titleFieldId = fields['书名'].id
          const targetTitle = String(book.title || '').trim()
          matchingRecords = records.filter(record => {
            const rawTitle = getRecordFieldValue(record, titleFieldId)
            const recordTitle = extractTextFromRichText(rawTitle)?.trim()
            return recordTitle && recordTitle === targetTitle
          })
          console.log('bookid 未匹配，使用书名匹配到条数:', matchingRecords.length, '书名:', targetTitle)
        }
        
        // console.log('匹配的记录:', matchingRecords)

        if (matchingRecords && matchingRecords.length > 0) {
          const recordId = matchingRecords[0].recordId

          // 格式化阅读时长
          const readingTimeMinutes = Math.floor(book.readingTime / 60)
          const readingTimeText = readingTimeMinutes >= 60 
            ? `${Math.floor(readingTimeMinutes / 60)}小时${readingTimeMinutes % 60}分钟`
            : `${readingTimeMinutes}分钟`

          try {
            // 计算值
            const progressValue = book.progress / 100
            
            // 根据进度计算阅读状态
            let readingStatusText
            if (book.progress === 0) {
              readingStatusText = '未读'
            } else if (book.progress === 100) {
              readingStatusText = '读完'
            } else {
              readingStatusText = '正在读'
            }

            // 获取"是否读完"字段的选项列表
            const readingStatusField = fields['是否读完']
            const options = await readingStatusField.getOptions()
            console.log('阅读状态字段选项:', options)
            
            // 查找匹配的选项
            const matchingOption = options.find(opt => opt.name === readingStatusText)
            let readingStatusValue = readingStatusText
            
            // 如果找到了匹配的选项，使用选项对象
            if (matchingOption) {
              readingStatusValue = {
                id: matchingOption.id,
                text: matchingOption.name
              }
              console.log('使用匹配的选项:', readingStatusValue)
            } else {
              console.warn('未找到匹配的选项，将使用文本:', readingStatusText)
            }

            // 更新阅读进度、阅读时长和阅读状态三个字段
            const recordValue = {
              fields: {
                [fields['阅读进度'].id]: progressValue,
                [fields['阅读时长'].id]: readingTimeText,
                [fields['是否读完'].id]: readingStatusValue
              }
            }

            console.log('更新记录:', {
              recordId,
              progressValue,
              readingTimeText,
              readingStatusText
            })

            // 调用setRecord方法更新记录
            await table.setRecord(recordId, recordValue)
            // 等待一下确保更新完成
            await new Promise(resolve => setTimeout(resolve, 500))
            
            // 验证更新是否成功
            const updatedRecord = await table.getRecordById(recordId)
            const updatedProgress = updatedRecord.fields[fields['阅读进度'].id]
            const actualPercent = Math.round((updatedProgress ?? 0) * 100)

            console.log('更新验证:', {
              原始进度: book.progress + '%',
              表格中的进度: updatedProgress,
              转回百分比: actualPercent + '%'
            })

            ElMessage.success(`已更新《${book.title}》的进度信息（进度：${actualPercent}%）`)

          } catch (error) {
            console.error('更新记录失败:', error)
            throw new Error(`更新记录失败: ${error.message}`)
          }
        } else {
          console.warn(`未找到对应的表格记录: ${book.title} (${book.bookId})`)
          ElMessage.warning(`未找到《${book.title}》对应的表格记录，请先使用"写入表格"功能添加该书籍。`)
        }
      } catch (error) {
        console.error('更新表格记录失败:', error)
        ElMessage.error(`更新表格记录失败: ${error.message}`)
      }
    } else {
      ElMessage.warning(`未找到《${book.title}》的最新进度信息`)
    }
    
    book.updating = false
  } catch (error) {
    book.updating = false
    ElMessage.error(`更新失败：${error.message}`)
  }
}

// 移除 formatProgress 函数，不对进度值做任何处理

// 格式化阅读时长显示
const formatDisplayReadingTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '0分钟'
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}小时${remainingMinutes > 0 ? remainingMinutes + '分钟' : ''}`
  }
  return `${minutes}分钟`
}

// 显示设置对话框
const showSettingsDialog = () => {
  cookieInput.value = wereadAPI.getCookies() || ''
  // 加载保存的 CookieCloud 配置
  loadCookieCloudConfig()
  showSettings.value = true
}

// 加载 CookieCloud 配置
const loadCookieCloudConfig = () => {
  try {
    const saved = localStorage.getItem('cookiecloud_config')
    if (saved) {
      cookiecloudConfig.value = JSON.parse(saved)
    }
  } catch (error) {
    console.error('加载 CookieCloud 配置失败:', error)
  }
}

// 保存 CookieCloud 配置
const saveCookieCloudConfig = () => {
  try {
    localStorage.setItem('cookiecloud_config', JSON.stringify(cookiecloudConfig.value))
  } catch (error) {
    console.error('保存 CookieCloud 配置失败:', error)
  }
}

// 处理 Cookie 来源类型切换
const handleSourceTypeChange = (tabName) => {
  if (tabName === 'manual') {
    cookieFromCloud.value = false
  }
}

// 从 CookieCloud 获取 Cookie
const fetchCookieFromCloud = async () => {
  if (!cookiecloudConfig.value.serverUrl || !cookiecloudConfig.value.uuid || !cookiecloudConfig.value.password) {
    ElMessage.warning('请先填写完整的 CookieCloud 配置信息')
    return
  }

  try {
    fetchingCookie.value = true
    
    const cookie = await cookieCloudAPI.getCookie(
      cookiecloudConfig.value.serverUrl,
      cookiecloudConfig.value.uuid,
      cookiecloudConfig.value.password,
      'weread.qq.com'
    )

    if (cookie) {
      cookieInput.value = cookie
      cookieFromCloud.value = true
      // 保存配置
      saveCookieCloudConfig()
      ElMessage.success('成功从 CookieCloud 获取 Cookie')
    } else {
      ElMessage.error('获取到的 Cookie 为空')
    }
  } catch (error) {
    console.error('从 CookieCloud 获取 Cookie 失败:', error)
    ElMessage.error('从 CookieCloud 获取 Cookie 失败：' + error.message)
  } finally {
    fetchingCookie.value = false
  }
}

// 测试 CookieCloud 连接
const testCookieCloudConnection = async () => {
  if (!cookiecloudConfig.value.serverUrl || !cookiecloudConfig.value.uuid || !cookiecloudConfig.value.password) {
    ElMessage.warning('请先填写完整的 CookieCloud 配置信息')
    return
  }

  try {
    testingConnection.value = true
    
    const result = await cookieCloudAPI.testConnection(
      cookiecloudConfig.value.serverUrl,
      cookiecloudConfig.value.uuid,
      cookiecloudConfig.value.password
    )

    if (result.success) {
      ElMessage.success('CookieCloud 连接测试成功')
      // 保存配置
      saveCookieCloudConfig()
    } else {
      ElMessage.error('CookieCloud 连接测试失败：' + (result.message || '请检查配置信息'))
    }
  } catch (error) {
    console.error('CookieCloud 连接测试失败:', error)
    ElMessage.error('CookieCloud 连接测试失败：' + error.message)
  } finally {
    testingConnection.value = false
  }
}

// 设置 Cookie
const setCookie = () => {
  try {
    if (!cookieInput.value) {
      ElMessage.error('请输入 Cookie')
      return
    }
    wereadAPI.setCookies(cookieInput.value)
    hasCookie.value = true
    showSettings.value = false
    ElMessage.success('Cookie 设置成功')
  } catch (error) {
    ElMessage.error('Cookie 设置失败：' + error.message)
  }
}

// 清除进度
const clearProgress = () => {
  try {
    wereadAPI.clearProgress()
    ElMessage.success('进度已清除')
  } catch (error) {
    ElMessage.error('清除进度失败：' + error.message)
  }
}

// 获取书架数据
const fetchBooks = async () => {
  try {
    loading.value = true
    syncProgress.value = '正在获取书架数据...'
    
    // 获取完整的书籍信息
    wereadAPI.onProgress = (current, total, title) => {
      syncProgress.value = `正在获取书籍详情 (${current}/${total}): ${title}`
    }
    
    const bookList = await wereadAPI.getCompleteBookInfo()
    
    // 安全检查：确保bookList存在且是数组
    if (!bookList || !Array.isArray(bookList)) {
      throw new Error('获取书籍列表失败')
    }
    
    // 确保每本书都有 updating 属性
    books.value = bookList.map(book => ({
      ...book,
      updating: false
    }))
    
    ElMessage.success(`成功获取 ${bookList.length} 本书的信息`)
  } catch (error) {
    ElMessage.error('获取书架失败：' + error.message)
  } finally {
    loading.value = false
    syncProgress.value = ''
  }
}

// 写入到飞书多维表格
const writeToTable = async () => {
  if (!books.value.length) {
    ElMessage.warning('没有可写入的书籍数据')
    return
  }

  try {
    loading.value = true
    syncProgress.value = '准备写入表格...'

    // 获取当前表格
    const table = await bitable.base.getActiveTable()
    if (!table) {
      throw new Error('未能获取到当前表格')
    }

    // 断点续写：检查表格中已经存在的书籍，跳过这些书籍，只写入剩余的
    // 使用 getTableBookIds 函数分页获取所有 bookid
    let existingBookIds = new Set()
    try {
      existingBookIds = await getTableBookIds()
      
      if (existingBookIds.size > 0) {
        console.log(`断点续写：表格中已有 ${existingBookIds.size} 本书，将跳过这些书籍`)
        ElMessage.info(`检测到表格已有数据，将只写入未记录的书籍...`)
      }
    } catch (e) {
      console.warn('读取表格数据失败，将从头开始写入:', e)
    }

    // 定义字段配置（调整字段顺序：书名在前，bookid在后；并将 bookid 改为文本类型）
    const fieldConfigs = [
      { name: '书名', type: 1 },
      { name: 'bookid', type: 1 },
      { name: '作者', type: 1 },
      { name: '简介', type: 1 },
      { name: '一级分类', type: 4 },
      { name: '二级分类', type: 4 },
      { name: '阅读时长', type: 1 },
      { name: '阅读进度', type: 2 },
      { name: '是否读完', type: 4 },
      { name: '封面链接', type: 15 }
    ]

    // 获取或创建字段
    syncProgress.value = '检查并创建必要的字段...'
    const fields = {}
    
    // 获取现有字段列表
    const existingFields = await table.getFieldMetaList()
    console.log('现有字段:', existingFields)

    // 逐个检查和创建字段
    for (const config of fieldConfigs) {
      try {
        // 检查字段是否已存在
        const existingField = existingFields.find(f => f.name === config.name)
        
        if (existingField) {
          // 使用现有字段
          fields[config.name] = await table.getField(config.name)
          console.log(`使用现有字段: ${config.name}, 当前类型: ${existingField.type}`)
          
          // 如果现有字段类型与期望类型不匹配，输出警告
          if (existingField.type !== config.type) {
            console.warn(`警告: 字段 ${config.name} 的现有类型(${existingField.type})与期望类型(${config.type})不匹配`)
          }
        } else {
          // 创建新字段
          console.log(`创建新字段: ${config.name}, 类型: ${config.type}`)
          try {
            fields[config.name] = await table.addField({
              type: config.type,
              name: config.name
            })
            console.log(`成功创建字段: ${config.name}`)
          } catch (error) {
            console.error(`创建字段失败: ${config.name}`, error)
            throw error
          }
          // 等待一下确保字段创建完成
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`处理字段 "${config.name}" 时出错:`, error)
        throw new Error(`创建字段 "${config.name}" 失败: ${error.message}`)
      }
    }

    // 写入数据（获取一条详情就立即写入一条记录）
    let skippedCount = 0
    let writtenCount = 0
    
    for (const [index, book] of books.value.entries()) {
      try {
        // 断点续写：检查这本书是否已经存在于表格中
        const bookIdComparable = String(book.bookId)
        
        if (existingBookIds.has(bookIdComparable)) {
          skippedCount++
          console.log(`跳过已存在的书籍: ${book.title} (${book.bookId})`)
          continue
        }
        
        // 先尝试获取详细信息（即使可能已有完整信息，也重新获取确保最新）
        syncProgress.value = `正在获取书籍详情 (${index + 1}/${books.value.length}): ${book.title}`
        
        let bookToWrite = book
        try {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 控制请求频率
          const bookInfo = await wereadAPI.getBookInfo(book.bookId)
          const [primaryCategory, secondaryCategory] = wereadAPI.parseCategory(bookInfo.category || '')
          
          // 合并信息
          bookToWrite = {
            ...book,
            ...bookInfo,
            primary_category: primaryCategory,
            secondary_category: secondaryCategory
          }
        } catch (error) {
          console.error(`获取书籍信息失败 (${book.bookId}):`, error)
          console.warn(`跳过书籍 ${book.title} (${book.bookId})，因为获取详情失败`)
          ElMessage.warning(`跳过书籍《${book.title}》，获取详情失败`)
          // 抛出特定错误以便外层识别和跳过
          throw new Error(`获取书籍信息失败 (${book.bookId}): ${error.message}`)
        }
        
        // 获取详情成功后才写入这条记录
        syncProgress.value = `写入表格中 (${index + 1}/${books.value.length}): ${bookToWrite.title}`
        
        // 格式化阅读时长为文本
        const readingTimeMinutes = Math.floor(bookToWrite.readingTime / 60)
        const readingTimeText = readingTimeMinutes >= 60 
          ? `${Math.floor(readingTimeMinutes / 60)}小时${readingTimeMinutes % 60}分钟`
          : `${readingTimeMinutes}分钟`

        // 准备记录数据
        const cells = []
        
        try {
          // bookId 作为字符串写入
          const bookIdStr = String(bookToWrite.bookId);
          console.log('正在写入书籍:', {
            title: bookToWrite.title,
            bookId: bookIdStr,
            bookIdType: typeof bookIdStr
          });
          
          cells.push(await fields['bookid'].createCell(bookIdStr));
          cells.push(await fields['书名'].createCell(bookToWrite.title))
          cells.push(await fields['作者'].createCell(bookToWrite.author))
          cells.push(await fields['简介'].createCell(bookToWrite.intro || ''))
          cells.push(await fields['一级分类'].createCell(bookToWrite.primary_category || '自导入'))
          cells.push(await fields['二级分类'].createCell(bookToWrite.secondary_category || '自导入'))
          cells.push(await fields['阅读时长'].createCell(readingTimeText))
          // 打印进度值
          console.log('写入进度值:', {
            title: bookToWrite.title,
            progress: bookToWrite.progress,
            type: typeof bookToWrite.progress
          });
          cells.push(await fields['阅读进度'].createCell(bookToWrite.progress / 100))
          
          // 根据进度设置阅读状态
          let readingStatus
          if (bookToWrite.progress === 0) {
            readingStatus = '未读'
          } else if (bookToWrite.progress === 100) {
            readingStatus = '读完'
          } else {
            readingStatus = '正在读'
          }
          cells.push(await fields['是否读完'].createCell(readingStatus))
          // 创建封面链接单元格
          const coverLinkCell = await fields['封面链接'].createCell(bookToWrite.cover)
          if (coverLinkCell) {
            cells.push(coverLinkCell)
          } else {
            console.warn(`无法创建封面链接单元格: ${bookToWrite.title}`)
          }
        } catch (error) {
          console.error('创建单元格失败:', error)
          throw new Error(`创建单元格失败: ${error.message}`)
        }

        // 添加记录
        await table.addRecord(cells)
        writtenCount++
        console.log(`成功添加记录: ${bookToWrite.title}`)
        
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        // 如果是获取详情失败，跳过这本书继续下一本
        if (error.message && error.message.includes('获取书籍信息失败')) {
          console.warn(`已跳过书籍 ${book.title}，继续处理下一本`)
          continue
        }
        // 创建单元格失败或其他错误的处理
        console.error(`处理第 ${index + 1} 本书时出错: ${error.message}`)
        ElMessage.error(`处理《${book.title}》时出错，已跳过`)
        // 不抛出错误，继续处理下一本
        continue
      }
    }

    // 输出断点续写统计信息
    let successMsg = `写入表格成功`
    if (skippedCount > 0) {
      successMsg += `，写入 ${writtenCount} 本新书，跳过 ${skippedCount} 本已存在的书籍`
    } else {
      successMsg += `，共写入 ${writtenCount} 本书`
    }
    ElMessage.success(successMsg)
  } catch (error) {
    const errorMessage = error.message || '未知错误'
    console.error('写入表格失败:', {
      message: errorMessage,
      stack: error.stack
    })
    ElMessage.error(`写入表格失败: ${errorMessage}`)
  } finally {
    loading.value = false
    syncProgress.value = ''
  }
}

// 检查是否已设置Cookie
onMounted(() => {
  const cookie = wereadAPI.getCookies()
  if (cookie) {
    hasCookie.value = true
  } else {
    showSettings.value = true
  }
  // 加载 CookieCloud 配置
  loadCookieCloudConfig()
})

// 从表格同步数据到前端
const syncFromTable = async () => {
  try {
    loading.value = true
    syncProgress.value = '正在从表格读取数据...'

    // 获取当前表格
    const table = await bitable.base.getActiveTable()
    if (!table) {
      throw new Error('未能获取到当前表格')
    }

    // 获取字段列表
    const existingFields = await table.getFieldMetaList()
    console.log('表格现有字段:', existingFields)

    // 定义需要读取的字段
    const fieldNames = [
      'bookid',
      '书名',
      '作者',
      '简介',
      '一级分类',
      '二级分类',
      '阅读时长',
      '阅读进度',
      '是否读完',
      '封面链接'
    ]

    // 获取字段对象
    const fields = {}
    for (const fieldName of fieldNames) {
      const field = existingFields.find(f => f.name === fieldName)
      if (field) {
        fields[fieldName] = {
          id: field.id,
          name: field.name
        }
      } else {
        console.warn(`字段不存在: ${fieldName}`)
      }
    }

    console.log('成功获取字段:', fields)

    // 使用统一 helper 获取记录，并通过 alert 打印进度
    debugAlert('开始读取表格记录...')
    const records = await fetchAllRecords(table)
    debugAlert(`读取完成，总计 ${records.length} 条记录`)

    // 转换记录为书籍对象
    syncProgress.value = '正在解析数据...'
    const booksData = []
    
    for (const record of records) {
      try {
        if (!record || !record.fields) {
          console.warn('无效的记录结构')
          continue
        }

        const book = {}
        
        // 读取各字段的值，并提取富文本内容
        if (fields['bookid']) {
          // bookid 统一转换为字符串（处理富文本/数组/对象）
          const bookIdValue = getRecordFieldValue(record, fields['bookid'].id)
          const idText = extractTextFromRichText(bookIdValue)
          book.bookId = idText ? idText.trim() : null
        }
        if (fields['书名']) {
          book.title = extractTextFromRichText(record.fields[fields['书名'].id])
        }
        if (fields['作者']) {
          book.author = extractTextFromRichText(record.fields[fields['作者'].id])
        }
        if (fields['简介']) {
          book.intro = extractTextFromRichText(record.fields[fields['简介'].id])
        }
        if (fields['一级分类']) {
          const categoryValue = record.fields[fields['一级分类'].id]
          // 如果是对象，提取text字段
          if (typeof categoryValue === 'object' && categoryValue !== null && categoryValue.text) {
            book.primary_category = categoryValue.text
          } else {
            book.primary_category = extractTextFromRichText(categoryValue)
          }
        }
        if (fields['二级分类']) {
          const categoryValue = record.fields[fields['二级分类'].id]
          // 如果是对象，提取text字段
          if (typeof categoryValue === 'object' && categoryValue !== null && categoryValue.text) {
            book.secondary_category = categoryValue.text
          } else {
            book.secondary_category = extractTextFromRichText(categoryValue)
          }
        }
        if (fields['封面链接']) {
          const coverLinks = record.fields[fields['封面链接'].id]
          if (coverLinks && coverLinks.length > 0) {
            book.cover = coverLinks[0].link
          }
        }

        // 处理阅读进度（表格中存储的是0-1的小数，需要转换为0-100的整数）
        if (fields['阅读进度']) {
          const progressValue = record.fields[fields['阅读进度'].id]
          book.progress = Math.round((progressValue || 0) * 100)
        }

        // 处理阅读时长（表格中存储的是文本，如"30分钟"或"1小时30分钟"）
        if (fields['阅读时长']) {
          const readingTimeValue = record.fields[fields['阅读时长'].id]
          book.readingTime = parseReadingTime(readingTimeValue)
        }

        // 处理阅读状态
        if (fields['是否读完']) {
          const readingStatusValue = record.fields[fields['是否读完'].id]
          // 如果是选项对象，提取text字段
          if (typeof readingStatusValue === 'object' && readingStatusValue !== null && readingStatusValue.text) {
            book.readingStatus = readingStatusValue.text
          } else {
            book.readingStatus = extractTextFromRichText(readingStatusValue)
          }
        }

        // 过滤掉无效数据
        if (book.bookId && book.title) {
          book.updating = false
          booksData.push(book)
        }
      } catch (error) {
        console.error('解析记录失败:', error)
      }
    }

    console.log('成功解析数据:', booksData.length, '本书')

    // 更新前端数据
    books.value = booksData
    
    // 重要：同步表格后，需要基于表格中的bookId更新previousBookIds
    // 这样后续的"同步书架"就能正确检测新增书籍
    const tableBookIds = new Set(booksData.map(book => book.bookId))
    previousBookIds.value = tableBookIds
    
    // 清空新增书籍列表（因为表格同步后，所有书籍都应该是"已知"的）
    newBookIds.value = []
    newBooks.value = []

    if (booksData.length > 0) {
      ElMessage.success(`成功从表格同步 ${booksData.length} 本书，已记录当前书籍列表用于检测新增`)
    } else {
      ElMessage.warning('表格中没有书籍数据')
    }

  } catch (error) {
    const errorMessage = error.message || '未知错误'
    console.error('同步表格失败:', errorMessage)
    ElMessage.error(`同步表格失败: ${errorMessage}`)
  } finally {
    loading.value = false
    syncProgress.value = ''
  }
}

// 提取富文本中的纯文本内容
const extractTextFromRichText = (value) => {
  if (!value) return ''
  
  // 如果已经是字符串，直接返回
  if (typeof value === 'string') {
    return value
  }
  
  // 如果是富文本数组，提取所有text字段
  if (Array.isArray(value)) {
    return value.map(item => item.text || '').join('')
  }
  
  // 如果是对象，尝试获取text字段
  if (typeof value === 'object' && value.text) {
    return value.text
  }
  
  // 如果是数字或其他类型，转换为字符串
  return String(value)
}

// 从记录中按字段ID提取值，兼容 fields 为对象或数组的情况
const getRecordFieldValue = (record, fieldId) => {
  if (!record || !record.fields) return undefined
  const f = record.fields
  if (Array.isArray(f)) {
    const item = f.find(it => it && (it.fieldId === fieldId || it.id === fieldId || it.field_id === fieldId))
    if (!item) return undefined
    // 常见可能的承载属性：value / values / text / cellValue
    if (item.value != null) return item.value
    if (item.values != null) return item.values
    if (item.text != null) return item.text
    if (item.cellValue != null) return item.cellValue
    return item
  }
  return f[fieldId]
}

// 解析阅读时长为秒数
const parseReadingTime = (timeText) => {
  // 先提取纯文本
  const text = extractTextFromRichText(timeText)
  
  if (!text || typeof text !== 'string') {
    return 0
  }
  
  let seconds = 0
  
  // 匹配小时
  const hourMatch = text.match(/(\d+)小时/)
  if (hourMatch) {
    seconds += parseInt(hourMatch[1]) * 3600
  }
  
  // 匹配分钟
  const minuteMatch = text.match(/(\d+)分钟/)
  if (minuteMatch) {
    seconds += parseInt(minuteMatch[1]) * 60
  }
  
  // 如果没有匹配到，尝试直接解析数字（当作分钟）
  if (seconds === 0 && !isNaN(text)) {
    seconds = parseInt(text) * 60
  }
  
  return seconds
}

// 更新新增书籍到表格
const updateNewBooksToTable = async () => {
  if (!newBooks.value.length) {
    ElMessage.warning('没有新增的书籍可以更新')
    return
  }

  try {
    loading.value = true
    syncProgress.value = '准备更新表格...'

    // 获取当前表格
    const table = await bitable.base.getActiveTable()
    if (!table) {
      throw new Error('未能获取到当前表格')
    }

    // 获取现有字段列表
    const existingFields = await table.getFieldMetaList()
    const fields = {}
    
    // 字段配置（调整字段顺序：书名在前，bookid在后）
    const fieldConfigs = [
      { name: '书名', type: 1 },
      { name: 'bookid', type: 1 },
      { name: '作者', type: 1 },
      { name: '简介', type: 1 },
      { name: '一级分类', type: 4 },
      { name: '二级分类', type: 4 },
      { name: '阅读时长', type: 1 },
      { name: '阅读进度', type: 2 },
      { name: '是否读完', type: 4 },
      { name: '封面链接', type: 15 }
    ]

    // 获取或创建字段
    for (const config of fieldConfigs) {
      const existingField = existingFields.find(f => f.name === config.name)
      if (existingField) {
        fields[config.name] = await table.getField(config.name)
      } else {
        fields[config.name] = await table.addField({
          type: config.type,
          name: config.name
        })
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 写入新增书籍数据（获取详情并立即写入）
    for (const [index, book] of newBooks.value.entries()) {
      try {
        // 新增书籍只有基础信息，需要获取详细信息
        let bookToWrite = book
        
        try {
          syncProgress.value = `正在获取书籍详情 (${index + 1}/${newBooks.value.length}): ${book.title}`
          
          await new Promise(resolve => setTimeout(resolve, 2000)) // 控制请求频率
          const bookInfo = await wereadAPI.getBookInfo(book.bookId)
          const [primaryCategory, secondaryCategory] = wereadAPI.parseCategory(bookInfo.category || '')
          
          // 合并信息
          bookToWrite = {
            ...book,
            ...bookInfo,
            primary_category: primaryCategory,
            secondary_category: secondaryCategory
          }
        } catch (error) {
          console.error(`获取书籍信息失败 (${book.bookId}):`, error)
          // 即使获取失败，也尝试写入基础信息
          bookToWrite = book
        }
        
        // 立即写入这条记录
        syncProgress.value = `更新表格中 (${index + 1}/${newBooks.value.length}): ${bookToWrite.title}`
        
        // 格式化阅读时长
        const readingTimeMinutes = Math.floor(bookToWrite.readingTime / 60)
        const readingTimeText = readingTimeMinutes >= 60 
          ? `${Math.floor(readingTimeMinutes / 60)}小时${readingTimeMinutes % 60}分钟`
          : `${readingTimeMinutes}分钟`

        // 准备记录数据
        const cells = []
        
        // bookId 作为字符串写入
        const bookIdStr = String(bookToWrite.bookId)
        cells.push(await fields['bookid'].createCell(bookIdStr))
        
        cells.push(await fields['书名'].createCell(bookToWrite.title))
        cells.push(await fields['作者'].createCell(bookToWrite.author))
        cells.push(await fields['简介'].createCell(bookToWrite.intro || ''))
        cells.push(await fields['一级分类'].createCell(bookToWrite.primary_category || '自导入'))
        cells.push(await fields['二级分类'].createCell(bookToWrite.secondary_category || '自导入'))
        cells.push(await fields['阅读时长'].createCell(readingTimeText))
        cells.push(await fields['阅读进度'].createCell(bookToWrite.progress / 100))
        
        // 根据进度设置阅读状态
        let readingStatus
        if (bookToWrite.progress === 0) {
          readingStatus = '未读'
        } else if (bookToWrite.progress === 100) {
          readingStatus = '读完'
        } else {
          readingStatus = '正在读'
        }
        cells.push(await fields['是否读完'].createCell(readingStatus))
        
        const coverLinkCell = await fields['封面链接'].createCell(bookToWrite.cover)
        if (coverLinkCell) {
          cells.push(coverLinkCell)
        }

        // 添加记录
        await table.addRecord(cells)
        console.log(`成功添加记录: ${bookToWrite.title}`)
        
        // 添加小延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        throw new Error(`处理第 ${index + 1} 本书时出错: ${error.message}`)
      }
    }

    ElMessage.success(`成功添加 ${newBooks.value.length} 本新增书籍到表格`)
    
    // 重要：更新previousBookIds，将新增的书籍ID加入其中
    // 这样下次同步时就不会重复检测这些书籍
    for (const bookId of newBookIds.value) {
      previousBookIds.value.add(bookId)
    }
    
    // 清空新增书籍列表
    newBookIds.value = []
    newBooks.value = []
  } catch (error) {
    const errorMessage = error.message || '未知错误'
    console.error('更新表格失败:', {
      message: errorMessage,
      stack: error.stack
    })
    ElMessage.error(`更新表格失败: ${errorMessage}`)
  } finally {
    loading.value = false
    syncProgress.value = ''
  }
}

// 导出方法供外部使用
defineExpose({
  writeToTable,
  books,
  updateNewBooksToTable
})
</script>

<style scoped>
.weread-bookshelf {
  width: 100%;
  padding: 12px;
  box-sizing: border-box;
  background-color: #f5f7fa;
  max-width: 1080px; /* 限宽居中，阅读更舒适 */
  margin: 0 auto;
}

.plugin-intro {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  
  h2 {
    font-size: 16px;
    color: #1a1a1a;
    margin: 0 0 8px 0;
    font-weight: 500;
  }
  
  p {
    font-size: 13px;
    color: #666;
    line-height: 1.6;
    margin: 0;
  }
}

.toolbar {
  margin-bottom: 16px;
  background: #fff;
  border-radius: 10px;
  padding: 14px 14px 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.04);
}

.search-group {
  margin-bottom: 10px;
}

.search-input {
  width: 100%;
  max-width: 400px; /* 控制搜索框最大宽度 */
  margin-bottom: 10px;
}

.action-group {
  width: 100%;
}

.action-buttons-row {
  display: flex;
  gap: 6px; /* 更自然的间距 */
  width: 100%;
  flex-wrap: wrap; /* 小屏自动换行 */
  align-items: stretch;
  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.action-btn {
  height: 36px;
  padding: 0 16px;
  font-size: 12px; /* 稍微增大文字，提升易读性 */
  border-radius: 8px;
  white-space: nowrap;
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: visible;
  
  &.action-equal {
    flex: 1; /* 三个主要按钮等宽 */
    min-width: 130px; /* 增加最小宽度，保证图标与文字完整显示 */
  }
  
  &.action-narrow {
    flex: 0 0 auto; /* 设置按钮不伸缩 */
    min-width: 130px; /* 增加设置按钮最小宽度，避免文字被遮挡 */
    max-width: 160px;
  }
  
  :deep(.el-icon) {
    font-size: 12px; /* 图标同步缩小 */
    margin-right: 4px;
    flex-shrink: 0; /* 图标不收缩 */
  }
  
  :deep(.el-button__text) {
    display: flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    overflow: visible; /* 确保文字完全显示 */
    text-overflow: clip; /* 不使用省略号，直接显示 */
  }
  
  &:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  /* 小屏幕优化 */
  @media (max-width: 768px) {
    &.action-equal,
    &.action-narrow {
      flex: 1;
      min-width: 0;
      max-width: none;
    }
    font-size: 12px;
    padding: 0 8px;
  }
}

.books-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  
  /* 添加滚动条样式 */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #dcdfe6;
    border-radius: 4px;
    
    &:hover {
      background: #c0c4cc;
    }
  }
}

.pagination-info {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  font-size: 13px;
  color: #666;
  text-align: center;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden; /* 容器不溢出 */
  
  span {
    display: block;
    white-space: normal; /* 允许换行 */
    word-break: break-word; /* 长词换行 */
  }
}

.pagination-wrapper {
  margin-top: 20px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden; /* 防止内部溢出 */
  
  :deep(.el-pagination) {
    justify-content: center;
    max-width: 100%;
    flex-wrap: wrap; /* 允许换行，避免溢出 */
    row-gap: 4px;
    column-gap: 6px;
  }

  /* 分页子元素在小屏时收缩，避免挤出容器 */
  :deep(.el-pagination__total),
  :deep(.el-pagination__sizes),
  :deep(.el-pagination__jump) {
    flex: 1 1 auto;
    min-width: 0;
  }
  :deep(.el-select .el-input),
  :deep(.el-select .el-input__inner) {
    min-width: 0;
  }
}

/* 小屏优化：隐藏不必要的元素，防止水平滚动 */
@media (max-width: 768px) {
  .pagination-wrapper {
    padding: 10px;
  }
  .pagination-wrapper :deep(.el-pagination__total) {
    display: none;
  }
  .pagination-wrapper :deep(.el-pagination__sizes) {
    display: none;
  }
  .pagination-wrapper :deep(.el-pagination__jump) {
    display: none;
  }
}

.book-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 12px;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 6px rgba(0,0,0,0.04);
  
  &:hover {
    background-color: #fafcff;
    box-shadow: 0 6px 18px rgba(0,0,0,0.06);
    .update-btn {
      opacity: 1;
    }
  }
}

.book-info {
  display: flex;
  gap: 16px;
  min-height: 126px; /* 与封面图高度一致 */
}

.book-cover {
  width: 90px;
  height: 126px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.book-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title-row {
  margin-bottom: 4px;
  
  h3 {
    margin: 0;
    font-size: 16px;
    line-height: 1.4;
    color: #1a1a1a;
    font-weight: normal;
  }
}

.author-row {
  color: #666;
  font-size: 13px;
  margin-bottom: 8px;
}

.update-row {
  margin-bottom: 16px;
  
  .update-btn {
    padding: 4px 0;
    height: auto;
    font-size: 13px;
    color: #1890ff;
    
    &:hover {
      color: #40a9ff;
    }
  }
}

.book-meta {
  margin-bottom: 16px;
}

.meta-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #666;
  align-items: center;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    color: #999;
    width: 62px;
    flex-shrink: 0;
  }
  
  .value {
    flex: 1;
    min-width: 0;
  }
}

.book-intro {
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
  
  .label {
    color: #999;
    font-size: 13px;
    margin-bottom: 8px;
  }
  
  .intro-text {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: #666;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.sync-progress {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 1001;
  max-width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 40px 0;
}

.settings-dialog {
  :deep(.el-dialog__body) {
    padding-top: 10px;
  }
}

/* 设置对话框内部布局优化 */
.settings-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 8px;
  }
}

.settings-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }
}

.settings-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-tips {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

:deep(.el-dialog) {
  margin: 5vh auto !important;
}
</style>