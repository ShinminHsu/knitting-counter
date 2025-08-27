import { StitchType, StitchInfo, StitchGroup, Round } from '../types'
import { generateId } from '../utils'
import { useSyncedAppStore } from '../store/syncedAppStore'

export function usePatternOperations() {
  const {
    currentProject,
    addRound,
    updateRound,
    deleteRound,
    addStitchToRound,
    deleteStitchFromRound,
    deleteStitchGroupFromRound,
    updateChart
  } = useSyncedAppStore()

  const handleAddRound = async (
    currentChart: any,
    chartPattern: Round[],
    newRoundNotes: string,
    isLoading: boolean,
    setIsLoading: (loading: boolean) => void
  ) => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const roundNumbers = chartPattern?.map(r => r.roundNumber) || []
      const nextRoundNumber = Math.max(0, ...roundNumbers) + 1
      
      const newRound: Round = {
        id: generateId(),
        roundNumber: nextRoundNumber,
        stitches: [],
        stitchGroups: [],
        notes: newRoundNotes.trim() || undefined
      }

      if (currentChart) {
        const updatedChart = {
          ...currentChart,
          rounds: [...currentChart.rounds, newRound],
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await addRound(newRound)
      }
    } catch (error) {
      console.error('Error adding round:', error)
      alert('新增圈數時發生錯誤')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRound = async (currentChart: any, roundNumber: number) => {
    if (confirm(`確定要刪除第 ${roundNumber} 圈嗎？`)) {
      if (currentChart) {
        const updatedRounds = currentChart.rounds
          .filter((r: Round) => r.roundNumber !== roundNumber)
          .map((r: Round) => ({
            ...r,
            roundNumber: r.roundNumber > roundNumber ? r.roundNumber - 1 : r.roundNumber
          }))
          .sort((a: Round, b: Round) => a.roundNumber - b.roundNumber)
        
        const updatedChart = {
          ...currentChart,
          rounds: updatedRounds,
          lastModified: new Date()
        }
        await updateChart(updatedChart)
      } else {
        await deleteRound(roundNumber)
      }
    }
  }

  const handleStitchModalConfirm = async (
    stitchType: StitchType,
    count: number,
    yarnId: string,
    customName: string | undefined,
    customSymbol: string | undefined,
    currentChart: any,
    roundNumber: number,
    isLoading: boolean,
    setIsLoading: (loading: boolean) => void
  ) => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject?.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitches: [...targetRound.stitches, newStitch]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        await addStitchToRound(roundNumber, newStitch)
      }
    } catch (error) {
      console.error('Error adding stitch:', error)
      alert('新增針法時發生錯誤')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleGroupStitchModalConfirm = async (
    stitchType: StitchType,
    count: number,
    yarnId: string,
    customName: string | undefined,
    customSymbol: string | undefined,
    currentChart: any,
    chartPattern: Round[],
    roundNumber: number,
    groupId: string,
    isLoading: boolean,
    setIsLoading: (loading: boolean) => void
  ) => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      const newStitch: StitchInfo = {
        id: generateId(),
        type: stitchType,
        yarnId: yarnId || currentProject?.yarns[0]?.id || '',
        count: count,
        ...(stitchType === StitchType.CUSTOM && {
          customName,
          customSymbol
        })
      }

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
              g.id === groupId
                ? { ...g, stitches: [...g.stitches, newStitch] }
                : g
            )
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        // Handle legacy project structure
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: targetRound.stitchGroups.map((g: StitchGroup) =>
              g.id === groupId
                ? { ...g, stitches: [...g.stitches, newStitch] }
                : g
            )
          }
          await updateRound(updatedRound)
        }
      }
    } catch (error) {
      console.error('Error adding group stitch:', error)
      alert('新增群組針法時發生錯誤')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddGroup = async (
    roundNumber: number,
    newGroupName: string,
    newGroupRepeatCount: number | string,
    newGroupStitches: StitchInfo[],
    currentChart: any,
    chartPattern: Round[]
  ) => {
    const trimmedName = newGroupName.trim() || '針目群組'
    const repeatCount = typeof newGroupRepeatCount === 'number' ? newGroupRepeatCount : parseInt(String(newGroupRepeatCount)) || 1
    
    if (newGroupStitches.length === 0) {
      alert('請至少新增一個針法到群組中')
      return
    }

    try {
      const newGroup: StitchGroup = {
        id: generateId(),
        name: trimmedName,
        stitches: newGroupStitches.map(stitch => ({
          ...stitch,
          id: generateId()
        })),
        repeatCount
      }

      if (currentChart) {
        const targetRound = currentChart.rounds.find((r: Round) => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          const updatedChart = {
            ...currentChart,
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            ),
            lastModified: new Date()
          }
          await updateChart(updatedChart)
        }
      } else {
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = {
            ...targetRound,
            stitchGroups: [...targetRound.stitchGroups, newGroup]
          }
          await updateRound(updatedRound)
        }
      }
    } catch (error) {
      console.error('Error adding group:', error)
      alert('新增群組時發生錯誤')
      throw error
    }
  }

  return {
    handleAddRound,
    handleDeleteRound,
    handleStitchModalConfirm,
    handleGroupStitchModalConfirm,
    handleAddGroup
  }
}