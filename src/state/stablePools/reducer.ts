import { createReducer } from '@reduxjs/toolkit'
import { Fraction, Token, TokenAmount } from '@ubeswap/sdk'
import JSBI from 'jsbi'
import { StableSwapMath } from 'utils/stableSwapMath'

import { initPool, updateVariableData } from './actions'

export type StableStakingInfo = {
  userStaked: JSBI
  totalMobiRate: JSBI
  pendingMobi: JSBI
}

export type StableSwapVariable = {
  balances: JSBI[]
  amp: JSBI
  lpTotalSupply: JSBI
  lpOwned: JSBI
  virtualPrice: JSBI
  aPrecise: JSBI
  feesGenerated: TokenAmount
  staking?: StableStakingInfo
}

export type StableSwapMathConstants = {
  name: string
  rates: JSBI[]
  lendingPrecision: JSBI
  precision: JSBI
  feeDenominator: JSBI
  precisionMul: JSBI[]
  feeIndex: number
  decimals: JSBI[]
  swapFee: JSBI
}

export type StableSwapConstants = StableSwapMathConstants & {
  tokens: Token[]
  tokenAddresses: string[]
  address: string
  lpToken: Token
  peggedTo: string
  pegComesAfter: boolean | undefined
  displayDecimals: number
  gaugeAddress?: string
  relativeGaugeWeight?: Fraction
}

export type StableSwapPool = StableSwapConstants & StableSwapVariable

export interface PoolState {
  readonly pools: {
    [name: string]: {
      pool: StableSwapPool
      math: StableSwapMath
    }
  }
}

const initialState: PoolState = {
  pools: {},
}

export default createReducer<PoolState>(initialState, (builder) =>
  builder
    .addCase(initPool, (state, { payload: { name, pool } }) => {
      const mathModel = new StableSwapMath(pool)
      return {
        ...state,
        pools: {
          ...state.pools,
          [name]: {
            pool,
            math: mathModel,
          },
        },
      }
    })
    .addCase(updateVariableData, (state, { payload: { name, variableData } }) => {
      const pool = state.pools[name]
      return {
        ...state,
        pools: {
          ...state.pools,
          [name]: {
            ...pool,
            pool: {
              ...pool.pool,
              ...variableData,
            },
          },
        },
      }
    })
)
