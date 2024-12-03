import { describe, it, expect, beforeEach } from 'vitest'

// Mock blockchain state
let gridStatus: { [key: number]: any } = {}
let userConsumption: { [key: string]: any } = {}
const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'

// Mock contract functions
const updateGridStatus = (sender: string, gridId: number, supply: number, demand: number) => {
  if (sender !== contractOwner) {
    return { success: false, error: 100 }
  }
  gridStatus[gridId] = {
    total_supply: supply,
    total_demand: demand,
    last_updated: Date.now()
  }
  return { success: true }
}

const reportConsumption = (sender: string, gridId: number, amount: number) => {
  const grid = gridStatus[gridId]
  if (!grid) {
    return { success: false, error: 101 }
  }
  
  const key = `${sender}:${gridId}`
  const currentConsumption = userConsumption[key] || { amount: 0 }
  
  userConsumption[key] = { amount }
  grid.total_demand = grid.total_demand - currentConsumption.amount + amount
  
  return { success: true }
}

const getGridStatus = (gridId: number) => {
  return gridStatus[gridId] || null
}

const getUserConsumption = (user: string, gridId: number) => {
  const key = `${user}:${gridId}`
  return userConsumption[key] || null
}

describe('LoadBalancing', () => {
  beforeEach(() => {
    gridStatus = {}
    userConsumption = {}
  })
  
  it('allows contract owner to update grid status', () => {
    const result = updateGridStatus(contractOwner, 1, 1000, 800)
    expect(result.success).toBe(true)
    
    const status = getGridStatus(1)
    expect(status).toBeTruthy()
    expect(status.total_supply).toBe(1000)
    expect(status.total_demand).toBe(800)
  })
  
  it('prevents non-owner from updating grid status', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    const result = updateGridStatus(wallet1, 1, 1000, 800)
    expect(result.success).toBe(false)
    expect(result.error).toBe(100)
  })
  
  it('allows users to report consumption', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    updateGridStatus(contractOwner, 1, 1000, 800)
    const result = reportConsumption(wallet1, 1, 50)
    
    expect(result.success).toBe(true)
    
    const consumption = getUserConsumption(wallet1, 1)
    expect(consumption).toBeTruthy()
    expect(consumption.amount).toBe(50)
    
    const status = getGridStatus(1)
    expect(status.total_demand).toBe(850)
  })
  
  it('prevents reporting consumption for non-existent grid', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    const result = reportConsumption(wallet1, 1, 50)
    expect(result.success).toBe(false)
    expect(result.error).toBe(101)
  })
  
  it('updates total demand correctly when consumption changes', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    updateGridStatus(contractOwner, 1, 1000, 800)
    reportConsumption(wallet1, 1, 50)
    const result = reportConsumption(wallet1, 1, 30)
    
    expect(result.success).toBe(true)
    
    const status = getGridStatus(1)
    expect(status.total_demand).toBe(830)
  })
})

