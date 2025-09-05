import { Link } from 'react-router-dom'
import { BsHouse } from 'react-icons/bs'

export default function UserGuideView() {
  return (
    <div className="min-h-screen bg-background-primary">
      {/* 標題列 */}
      <div className="bg-background-secondary border-b border-border">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <BsHouse className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <h1 className="text-base sm:text-xl font-semibold text-text-primary">使用說明</h1>
          </div>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            
            {/* 快速開始 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">快速開始</h2>
              <div className="space-y-3 text-text-secondary leading-relaxed">
                <p>歡迎使用 Stitchie！這是一個專為編織愛好者設計的工具，幫助您追蹤編織進度、管理織圖和記錄編織專案。</p>
                <div className="bg-background-secondary p-4 rounded-lg">
                  <h3 className="font-medium text-text-primary mb-2">第一次使用？</h3>
                  <p>我們為您準備了一個範例杯墊專案，您可以先探索各項功能，熟悉介面操作。</p>
                </div>
              </div>
            </section>

            {/* 專案管理 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">專案管理</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">建立新專案</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>點擊首頁的「新增專案」按鈕</li>
                    <li>輸入專案名稱（必填）</li>
                    <li>可選填來源網址，記錄織圖出處</li>
                    <li>點擊「建立」完成專案建立</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">專案操作</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>點擊專案卡片進入專案詳情</li>
                    <li>在專案列表中可以查看進度百分比</li>
                    <li>長按或右鍵專案可以刪除（請謹慎操作）</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 織圖編輯 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">織圖編輯</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">添加針法</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>在專案詳情頁面點擊「編輯織圖」</li>
                    <li>選擇要編輯的段/輪次</li>
                    <li>點擊「+」按鈕添加針法</li>
                    <li>選擇針法類型（短針、長針、鎖針等）</li>
                    <li>設定針數和毛線顏色</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">針法群組</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>可以將多個針法組合成群組</li>
                    <li>設定群組重複次數</li>
                    <li>方便管理複雜的織圖模式</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 進度追蹤 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">進度追蹤</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">編織模式</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>點擊「開始編織」進入追蹤模式</li>
                    <li>依照織圖顯示的針法順序進行編織</li>
                    <li>完成一針點擊一次，系統會自動記錄</li>
                    <li>支持撤銷操作，避免誤觸</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">查看模式</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>可以純查看織圖，不記錄進度</li>
                    <li>適合複習織圖或檢查針法</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 毛線管理 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">毛線管理</h2>
              <div className="space-y-3">
                <p className="text-text-secondary">在毛線管理頁面中，您可以：</p>
                <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                  <li>添加新的毛線，設定名稱、品牌和顏色</li>
                  <li>編輯現有毛線的資訊</li>
                  <li>設定毛線顏色，支援色彩選擇器</li>
                  <li>刪除不再使用的毛線</li>
                </ul>
              </div>
            </section>

            {/* 資料管理 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">資料管理</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">訪客模式 vs 登入模式</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-background-secondary p-4 rounded-lg">
                      <h4 className="font-medium text-text-primary mb-2">訪客模式</h4>
                      <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
                        <li>資料僅儲存在本地裝置</li>
                        <li>不會同步到雲端</li>
                        <li>清除瀏覽器資料會遺失</li>
                        <li>建議定期備份專案</li>
                      </ul>
                    </div>
                    <div className="bg-background-secondary p-4 rounded-lg">
                      <h4 className="font-medium text-text-primary mb-2">登入模式</h4>
                      <ul className="list-disc list-inside space-y-1 text-text-secondary text-sm">
                        <li>目前僅開放給特定用戶</li>
                        <li>支援跨裝置資料同步</li>
                        <li>資料安全存放在雲端</li>
                        <li>可在多個裝置間使用</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">匯入/匯出</h3>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary ml-4">
                    <li>可匯出專案為 JSON 檔案備份</li>
                    <li>支援匯入之前匯出的專案檔案</li>
                    <li>建議定期備份重要專案</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 小技巧 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">使用小技巧</h2>
              <div className="space-y-3">
                <ul className="list-disc list-inside space-y-2 text-text-secondary ml-4">
                  <li><strong>專案命名：</strong>建議使用有意義的名稱，如「媽媽的圍巾」、「聖誕節襪子」</li>
                  <li><strong>記錄來源：</strong>在來源欄位記錄織圖網址，方便日後查詢</li>
                  <li><strong>毛線顏色：</strong>設定接近實際的毛線顏色，有助於視覺識別</li>
                  <li><strong>定期備份：</strong>重要專案請定期匯出備份</li>
                  <li><strong>編織筆記：</strong>在段次備註中記錄特殊技巧或注意事項</li>
                </ul>
              </div>
            </section>

            {/* 常見問題 */}
            <section className="card">
              <h2 className="text-xl font-semibold text-text-primary mb-4">常見問題</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Q: 如果不小心清除了瀏覽器資料怎麼辦？</h3>
                  <p className="text-text-secondary ml-4">訪客模式下的資料僅存在本地，清除後無法復原。建議定期使用匯出功能備份專案。</p>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Q: 可以在手機上使用嗎？</h3>
                  <p className="text-text-secondary ml-4">是的！本應用採用響應式設計，支援手機、平板和電腦使用。</p>
                </div>
                <div>
                  <h3 className="font-medium text-text-primary mb-2">Q: 如何申請雲端同步功能？</h3>
                  <p className="text-text-secondary ml-4">目前雲端同步功能處於測試階段，僅開放給特定用戶。如需申請，請聯繫開發團隊。</p>
                </div>
              </div>
            </section>

            {/* 返回按鈕 */}
            <div className="text-center pt-8">
              <Link 
                to="/"
                className="btn btn-primary"
              >
                返回首頁
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}