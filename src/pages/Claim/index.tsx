import { ErrorBoundary } from '@sentry/react'
import React from 'react'
import { useClaimInfo } from 'state/claim/hooks'
import styled from 'styled-components'

import { ClaimCard } from '../../components/claim/ClaimCard'
import { AutoColumn } from '../../components/Column'
import { RowBetween } from '../../components/Row'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
  margin-top: 3rem;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

// {stakedPools.length > 0 && (
//   <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
//     <DataRow style={{ alignItems: 'baseline' }}>
//       <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Your Pools</TYPE.mediumHeader>
//       <div>{/* TODO(igm): show TVL here */}</div>
//     </DataRow>

//     <PoolSection>
//       {stakedPools.map((pool) => (
//         <ErrorBoundary key={pool.stakingRewardAddress}>
//           <PoolCard stakingInfo={pool} />
//         </ErrorBoundary>
//       ))}
//     </PoolSection>
//   </AutoColumn>
// )}

export default function Earn() {
  const claim = useClaimInfo()

  return (
    <PageWrapper gap="lg" justify="center">
      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <PoolSection>
          <ErrorBoundary key={'000'}>
            <ClaimCard claimInfo={claim} />
          </ErrorBoundary>
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
