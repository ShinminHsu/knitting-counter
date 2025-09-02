import React, { useState, useEffect } from 'react'
import { guestDataBackup } from '../services/guestDataBackup'
import { useProjectStore } from '../stores/useProjectStore'

interface GuestDataRecoveryProps {
  onRecoveryComplete: () => void
}

export const GuestDataRecovery: React.FC<GuestDataRecoveryProps> = ({ onRecoveryComplete }) => {
  const [hasBackup, setHasBackup] = useState(false)
  const [backupInfo, setBackupInfo] = useState<{ projectCount: number; lastBackup: Date | null } | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)

  const { setProjects, setCurrentProject } = useProjectStore()

  useEffect(() => {
    checkForBackup()
  }, [])

  const checkForBackup = async () => {
    try {
      const hasData = await guestDataBackup.hasBackupData()
      if (hasData) {
        const info = await guestDataBackup.getBackupInfo()
        setHasBackup(true)
        setBackupInfo(info)
        setShowRecovery(true)
      } else {
        onRecoveryComplete()
      }
    } catch (error) {
      console.error('[RECOVERY] Error checking backup:', error)
      onRecoveryComplete()
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const backupData = await guestDataBackup.restoreGuestData()
      if (backupData) {
        // 獲取當前本地項目
        const { projects: currentProjects } = useProjectStore.getState()
        
        console.log('[RECOVERY] Merging backup data with current projects:', {
          backupProjects: backupData.projects.length,
          currentProjects: currentProjects.length,
          backupProjectNames: backupData.projects.map(p => p.name),
          currentProjectNames: currentProjects.map(p => p.name)
        })
        
        // 智能合併：以最新修改時間為準
        const allProjects = [...currentProjects]
        const existingIds = new Set(currentProjects.map(p => p.id))
        
        // 添加備份中不存在於當前項目列表的項目
        for (const backupProject of backupData.projects) {
          if (!existingIds.has(backupProject.id)) {
            allProjects.push(backupProject)
            console.log('[RECOVERY] Added missing project from backup:', backupProject.name)
          } else {
            // 如果項目存在，比較修改時間，選擇更新的版本
            const currentProject = currentProjects.find(p => p.id === backupProject.id)
            if (currentProject && backupProject.lastModified > currentProject.lastModified) {
              const index = allProjects.findIndex(p => p.id === backupProject.id)
              allProjects[index] = backupProject
              console.log('[RECOVERY] Updated project from backup (newer):', backupProject.name)
            }
          }
        }
        
        // 設置合併後的項目
        setProjects(allProjects)
        
        // 設置當前項目：優先使用備份的當前項目，如果不存在則保持現有的
        const { currentProject: localCurrentProject } = useProjectStore.getState()
        if (backupData.currentProject && allProjects.find(p => p.id === backupData.currentProject!.id)) {
          setCurrentProject(backupData.currentProject)
        } else if (localCurrentProject && allProjects.find(p => p.id === localCurrentProject.id)) {
          // 保持現有的當前項目
        } else if (allProjects.length > 0) {
          // 如果都沒有，選擇最後修改的項目
          const latestProject = allProjects.reduce((latest, project) => 
            project.lastModified > latest.lastModified ? project : latest
          )
          setCurrentProject(latestProject)
        }
        
        console.log('[RECOVERY] Data merged successfully, total projects:', allProjects.length)
      }
    } catch (error) {
      console.error('[RECOVERY] Error restoring data:', error)
    } finally {
      setIsRestoring(false)
      setShowRecovery(false)
      onRecoveryComplete()
    }
  }

  const handleSkip = () => {
    setShowRecovery(false)
    onRecoveryComplete()
  }

  if (!showRecovery || !hasBackup || !backupInfo) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                發現備份資料
              </h3>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-3">
              我們發現了您之前的訪客模式資料備份：
            </p>
            <ul className="bg-gray-50 rounded-md p-3 space-y-1">
              <li>• 專案數量: {backupInfo.projectCount} 個</li>
              <li>• 備份時間: {backupInfo.lastBackup?.toLocaleString('zh-TW') || '未知'}</li>
            </ul>
            <p className="mt-3 text-gray-700">
              是否要恢復這些資料？
            </p>
          </div>
          
          <div className="mt-6 flex gap-3">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRestoring ? '恢復中...' : '恢復資料'}
            </button>
            <button
              onClick={handleSkip}
              disabled={isRestoring}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              跳過
            </button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500">
            選擇「跳過」會開始使用空白的專案列表，但備份資料不會被刪除。
          </div>
        </div>
      </div>
    </div>
  )
}