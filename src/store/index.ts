import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Project, WorkSession, Yarn, Round, StitchInfo, StitchGroup } from '../types'
import { generateId, createSampleProject, getRoundTotalStitches } from '../utils'

interface AppStore {
  // 狀態
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  
  // 動作
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // 專案管理
  createProject: (name: string, source?: string) => void
  updateProject: (project: Project) => void
  deleteProject: (id: string) => void
  setCurrentProject: (id: string) => void
  loadProjects: () => Promise<void>
  
  // 編織進度
  nextStitch: () => void
  previousStitch: () => void
  setCurrentRound: (roundNumber: number) => void
  setCurrentStitch: (stitchNumber: number) => void
  startSession: () => void
  endSession: () => void
  
  // 織圖管理
  addRound: (round: Round) => void
  updateRound: (round: Round) => void
  deleteRound: (roundNumber: number) => void
  addStitchToRound: (roundNumber: number, stitch: StitchInfo) => void
  addStitchGroupToRound: (roundNumber: number, group: StitchGroup) => void
  
  // 毛線管理
  addYarn: (yarn: Yarn) => void
  updateYarn: (yarn: Yarn) => void
  deleteYarn: (id: string) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 初始狀態
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,

      // 基本動作
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),

      // 專案管理
      createProject: (name, source) => {
        const newProject: Project = {
          id: generateId(),
          name,
          source,
          pattern: [],
          currentRound: 1,
          currentStitch: 0,
          yarns: [],
          sessions: [],
          createdDate: new Date(),
          lastModified: new Date()
        }
        
        set(state => ({
          projects: [...state.projects, newProject],
          currentProject: newProject
        }))
      },

      updateProject: (updatedProject) => {
        const updatedProjectWithTimestamp = {
          ...updatedProject,
          lastModified: new Date()
        }
        
        set(state => ({
          projects: state.projects.map(p => 
            p.id === updatedProject.id ? updatedProjectWithTimestamp : p
          ),
          currentProject: state.currentProject?.id === updatedProject.id 
            ? updatedProjectWithTimestamp 
            : state.currentProject
        }))
      },

      deleteProject: (id) => {
        set(state => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
      },

      setCurrentProject: (id) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({ currentProject: project })
        }
      },

      loadProjects: async () => {
        // 如果沒有專案，建立樣本專案
        const { projects } = get()
        if (projects.length === 0) {
          const sampleProject = createSampleProject()
          set({
            projects: [sampleProject],
            currentProject: sampleProject
          })
        }
      },

      // 編織進度管理
      nextStitch: () => {
        const { currentProject } = get()
        if (!currentProject) return

        const currentRound = currentProject.pattern.find(r => r.roundNumber === currentProject.currentRound)
        if (!currentRound) return

        const totalStitchesInRound = getRoundTotalStitches(currentRound)
        let newStitch = currentProject.currentStitch + 1
        let newRound = currentProject.currentRound

        // 如果超過當前圈數的針數，移到下一圈
        if (newStitch >= totalStitchesInRound) {
          newStitch = 0
          newRound = currentProject.currentRound + 1
        }

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      previousStitch: () => {
        const { currentProject } = get()
        if (!currentProject) return

        let newStitch = currentProject.currentStitch - 1
        let newRound = currentProject.currentRound

        // 如果小於0，移到上一圈的最後一針
        if (newStitch < 0 && newRound > 1) {
          newRound = currentProject.currentRound - 1
          const previousRound = currentProject.pattern.find(r => r.roundNumber === newRound)
          if (previousRound) {
            newStitch = getRoundTotalStitches(previousRound) - 1
          } else {
            newStitch = 0
          }
        } else if (newStitch < 0) {
          newStitch = 0
        }

        const updatedProject = {
          ...currentProject,
          currentRound: newRound,
          currentStitch: newStitch,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      setCurrentRound: (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentRound: roundNumber,
          currentStitch: 0,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      setCurrentStitch: (stitchNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          currentStitch: stitchNumber,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      startSession: () => {
        const { currentProject } = get()
        if (!currentProject) return

        const newSession: WorkSession = {
          id: generateId(),
          startTime: new Date(),
          duration: 0,
          roundsCompleted: 0,
          stitchesCompleted: 0
        }

        const updatedProject = {
          ...currentProject,
          sessions: [...currentProject.sessions, newSession],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      endSession: () => {
        const { currentProject } = get()
        if (!currentProject || currentProject.sessions.length === 0) return

        const lastSession = currentProject.sessions[currentProject.sessions.length - 1]
        if (lastSession.duration > 0) return // 已經結束的工作階段

        const now = new Date()
        const duration = Math.floor((now.getTime() - lastSession.startTime.getTime()) / 1000)

        const updatedSession = {
          ...lastSession,
          duration
        }

        const updatedProject = {
          ...currentProject,
          sessions: [
            ...currentProject.sessions.slice(0, -1),
            updatedSession
          ],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      // 織圖管理
      addRound: (round) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: [...currentProject.pattern, round],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      updateRound: (updatedRound) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          pattern: currentProject.pattern.map(r => 
            r.id === updatedRound.id ? updatedRound : r
          ),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      deleteRound: (roundNumber) => {
        const { currentProject } = get()
        if (!currentProject) return

        // 刪除指定圈數
        const filteredPattern = currentProject.pattern.filter(r => r.roundNumber !== roundNumber)
        
        // 重新編號後續圈數
        const renumberedPattern = filteredPattern.map(round => {
          if (round.roundNumber > roundNumber) {
            return {
              ...round,
              roundNumber: round.roundNumber - 1
            }
          }
          return round
        })

        // 調整當前圈數
        let newCurrentRound = currentProject.currentRound
        if (newCurrentRound > roundNumber) {
          newCurrentRound = Math.max(1, newCurrentRound - 1)
        }

        const updatedProject = {
          ...currentProject,
          pattern: renumberedPattern,
          currentRound: newCurrentRound,
          currentStitch: 0,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      addStitchToRound: (roundNumber, stitch) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitches: [...round.stitches, stitch]
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      addStitchGroupToRound: (roundNumber, group) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedPattern = currentProject.pattern.map(round => {
          if (round.roundNumber === roundNumber) {
            return {
              ...round,
              stitchGroups: [...round.stitchGroups, group]
            }
          }
          return round
        })

        const updatedProject = {
          ...currentProject,
          pattern: updatedPattern,
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      // 毛線管理
      addYarn: (yarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: [...currentProject.yarns, yarn],
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      updateYarn: (updatedYarn) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.map(y => 
            y.id === updatedYarn.id ? updatedYarn : y
          ),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      },

      deleteYarn: (id) => {
        const { currentProject } = get()
        if (!currentProject) return

        const updatedProject = {
          ...currentProject,
          yarns: currentProject.yarns.filter(y => y.id !== id),
          lastModified: new Date()
        }

        get().updateProject(updatedProject)
      }
    }),
    {
      name: 'knitting-counter-storage',
      partialize: (state) => ({
        projects: state.projects,
        currentProject: state.currentProject
      })
    }
  )
)