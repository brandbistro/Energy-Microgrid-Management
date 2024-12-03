import { describe, it, expect, beforeEach } from 'vitest'

// Mock blockchain state
let carbonOffsets: { [key: string]: any } = {}
let tokenBalances: { [key: string]: number } = {}
const contractOwner = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'

// Mock contract functions
const mintCarbonCredits = (sender: string, recipient: string, amount: number) => {
  if (sender !== contractOwner) {
    return { success: false, error: 100 }
  }
  tokenBalances[recipient] = (tokenBalances[recipient] || 0) + amount
  const currentOffset = carbonOffsets[recipient] || { amount: 0 }
  carbonOffsets[recipient] = { amount: currentOffset.amount + amount }
  return { success: true }
}

const transferCarbonCredits = (sender: string, recipient: string, amount: number) => {
  if (!tokenBalances[sender] || tokenBalances[sender] < amount) {
    return { success: false, error: 101 }
  }
  tokenBalances[sender] -= amount
  tokenBalances[recipient] = (tokenBalances[recipient] || 0) + amount
  
  const senderOffset = carbonOffsets[sender] || { amount: 0 }
  const recipientOffset = carbonOffsets[recipient] || { amount: 0 }
  
  carbonOffsets[sender] = { amount: senderOffset.amount - amount }
  carbonOffsets[recipient] = { amount: recipientOffset.amount + amount }
  
  return { success: true }
}

const getCarbonOffset = (user: string) => {
  return carbonOffsets[user] || { amount: 0 }
}

const getCarbonCreditBalance = (user: string) => {
  return { success: true, value: tokenBalances[user] || 0 }
}

describe('CarbonOffset', () => {
  beforeEach(() => {
    carbonOffsets = {}
    tokenBalances = {}
  })
  
  it('allows contract owner to mint carbon credits', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    
    const result = mintCarbonCredits(contractOwner, wallet1, 100)
    expect(result.success).toBe(true)
    
    const balance = getCarbonCreditBalance(wallet1)
    expect(balance.value).toBe(100)
    
    const offset = getCarbonOffset(wallet1)
    expect(offset.amount).toBe(100)
  })
  
  it('prevents non-owner from minting carbon credits', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    const result = mintCarbonCredits(wallet1, wallet2, 100)
    expect(result.success).toBe(false)
    expect(result.error).toBe(100)
  })
  
  it('allows transfer of carbon credits between users', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    mintCarbonCredits(contractOwner, wallet1, 100)
    const result = transferCarbonCredits(wallet1, wallet2, 50)
    
    expect(result.success).toBe(true)
    
    const balance1 = getCarbonCreditBalance(wallet1)
    const balance2 = getCarbonCreditBalance(wallet2)
    expect(balance1.value).toBe(50)
    expect(balance2.value).toBe(50)
    
    const offset1 = getCarbonOffset(wallet1)
    const offset2 = getCarbonOffset(wallet2)
    expect(offset1.amount).toBe(50)
    expect(offset2.amount).toBe(50)
  })
  
  it('prevents transfer of more credits than available', () => {
    const wallet1 = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    const wallet2 = 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC'
    
    mintCarbonCredits(contractOwner, wallet1, 100)
    const result = transferCarbonCredits(wallet1, wallet2, 150)
    
    expect(result.success).toBe(false)
    expect(result.error).toBe(101)
  })
})

