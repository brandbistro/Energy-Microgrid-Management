import { describe, it, expect, beforeEach } from 'vitest'

// Mock blockchain state
let projects: { [key: number]: any } = {}
let investments: { [key: string]: any } = {}
let tokenBalances: { [key: string]: number } = {}
let lastProjectId = 0

// Mock contract functions
const createProject = (sender: string, name: string, targetAmount: number) => {
  lastProjectId++
  projects[lastProjectId] = {
    name,
    target_amount: targetAmount,
    current_amount: 0,
    owner: sender,
    status: "active"
  }
  return { success: true, value: lastProjectId }
}

const investInProject = (sender: string, projectId: number, amount: number) => {
  const project = projects[projectId]
  if (!project) {
    return { success: false, error: 101 }
  }
  if (project.status !== "active") {
    return { success: false, error: 102 }
  }
  
  // Simulate STX transfer
  if ((tokenBalances[sender] || 0) < amount) {
    return { success: false, error: 103 }
  }
  tokenBalances[sender] = (tokenBalances[sender] || 0) - amount
  tokenBalances[project.owner] = (tokenBalances[project.owner] || 0) + amount
  
  const key = `${projectId}:${sender}`
  const currentInvestment = investments[key] || { amount: 0 }
  investments[key] = { amount: currentInvestment.amount + amount }
  
  project.current_amount += amount
  if (project.current_amount >= project.target_amount) {
    project.status = "funded"
  }
  
  // Simulate energy token minting
  tokenBalances[sender] = (tokenBalances[sender] || 0) + amount
  
  return { success: true }
}

const getProject = (projectId: number) => {
  return projects[projectId] || null
}

const getInvestment = (projectId: number, investor: string) => {
  const key = `${projectId}:${investor}`
  return investments[key] || null
}

describe('Investment', () => {
  beforeEach(() => {
    projects = {}
    investments = {}
    tokenBalances = {}
    lastProjectId = 0
  })
  
  it('allows creating a project', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    const result = createProject(wallet1, "Solar Farm", 1000)
    expect(result.success).toBe(true)
    expect(result.value).toBe(1)
    
    const project = getProject(1)
    expect(project).toBeTruthy()
    expect(project.name).toBe("Solar Farm")
    expect(project.target_amount).toBe(1000)
    expect(project.current_amount).toBe(0)
    expect(project.owner).toBe(wallet1)
    expect(project.status).toBe("active")
  })
  
  it('allows investing in a project', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    createProject(wallet1, "Solar Farm", 1000)
    tokenBalances[wallet2] = 500 // Ensure wallet2 has enough balance
    
    const result = investInProject(wallet2, 1, 500)
    expect(result.success).toBe(true)
    
    const project = getProject(1)
    expect(project.current_amount).toBe(500)
    
    const investment = getInvestment(1, wallet2)
    expect(investment).toBeTruthy()
    expect(investment.amount).toBe(500)
    
    expect(tokenBalances[wallet1]).toBe(500) // Project owner received the investment
    expect(tokenBalances[wallet2]).toBe(500) // Investor received energy tokens
  })
  
  it('updates project status to funded when target is reached', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    createProject(wallet1, "Solar Farm", 1000)
    tokenBalances[wallet2] = 1000
    
    investInProject(wallet2, 1, 1000)
    
    const project = getProject(1)
    expect(project.status).toBe("funded")
  })
  
  it('prevents investing in non-existent projects', () => {
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    tokenBalances[wallet2] = 500
    
    const result = investInProject(wallet2, 999, 500)
    expect(result.success).toBe(false)
    expect(result.error).toBe(101)
  })
  
  it('prevents investing in funded projects', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    createProject(wallet1, "Solar Farm", 1000)
    tokenBalances[wallet2] = 1500
    
    investInProject(wallet2, 1, 1000)
    const result = investInProject(wallet2, 1, 500)
    
    expect(result.success).toBe(false)
    expect(result.error).toBe(102)
  })
  
  it('prevents investing more than available balance', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    createProject(wallet1, "Solar Farm", 1000)
    tokenBalances[wallet2] = 400
    
    const result = investInProject(wallet2, 1, 500)
    expect(result.success).toBe(false)
    expect(result.error).toBe(103)
  })
})

