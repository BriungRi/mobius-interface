// To-Do: Implement Hooks to update Client-Side contract representation
import { JSBI } from '@ubeswap/sdk'
import { useSelector } from 'react-redux'

import { AppState } from '..'
import { Claim } from './reducer'

export interface ClaimInfo {
  readonly allocatedAmount: JSBI
  readonly claimedAmount: JSBI
  readonly unclaimedAmount: JSBI
}

export function useClaimInfo(): ClaimInfo {
  const claim = useSelector<AppState, Claim>((state) => state.claim.claim)

  if (claim == null) {
    return {
      allocatedAmount: JSBI.BigInt(0),
      claimedAmount: JSBI.BigInt(0),
      unclaimedAmount: JSBI.BigInt(0),
    }
  }
  return {
    allocatedAmount: claim.allocatedAmount,
    claimedAmount: claim.claimedAmount,
    unclaimedAmount: claim.unclaimedAmount,
  }
}
