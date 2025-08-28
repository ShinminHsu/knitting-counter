import { StitchType, StitchInfo, StitchGroup, Round } from '../types'
import { generateId } from '../utils'
import { useProjectStore } from '../stores/useProjectStore'
import { useChartStore } from '../stores/useChartStore'
import { usePatternStore } from '../stores/usePatternStore'

export function usePatternOperations() {
  const { currentProject } = useProjectStore()
  const { updateChart } = useChartStore()
  const { addRound, updateRound, deleteRound, addStitch } = usePatternStore()

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
        await updateChart(updatedChart.id, updatedChart)
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
        await updateChart(updatedChart.id, updatedChart)
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
      const { addStitchToPatternItems } = await import('../utils')
      
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
          // 使用 addStitchToPatternItems 來維持順序
          const updatedRound = addStitchToPatternItems(targetRound, newStitch)
          
          await updateChart(currentChart.id, {
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            )
          })
        }
      } else {
        await addStitch(roundNumber, newStitch)
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
          await updateChart(updatedChart.id, updatedChart)
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
          await updateRound(updatedRound.roundNumber, updatedRound)
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
      const { addGroupToPatternItems } = await import('../utils')
      
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
          // 使用 addGroupToPatternItems 來維持順序
          const updatedRound = addGroupToPatternItems(targetRound, newGroup)
          
          await updateChart(currentChart.id, {
            rounds: currentChart.rounds.map((r: Round) =>
              r.roundNumber === roundNumber ? updatedRound : r
            )
          })
        }
      } else {
        const targetRound = chartPattern.find(r => r.roundNumber === roundNumber)
        if (targetRound) {
          const updatedRound = addGroupToPatternItems(targetRound, newGroup)
          await updateRound(updatedRound.roundNumber, updatedRound)
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