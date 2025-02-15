import { JSBI, TokenAmount } from '@ubeswap/sdk'
import { ButtonOutlined, ButtonPrimary } from 'components/Button'
import { AutoColumn } from 'components/Column'
import { CardNoise } from 'components/earn/styled'
import Loader from 'components/Loader'
import { AutoRow, RowBetween, RowFixed } from 'components/Row'
import { ChainLogo } from 'constants/StablePools'
import { usePoolColor } from 'hooks/useColor'
import React, { useState } from 'react'
import { isMobile } from 'react-device-detect'
import { ChevronDown, ChevronUp } from 'react-feather'
import { usePriceOfLp } from 'state/stablePools/hooks'
import { GaugeSummary, MobiStakingInfo } from 'state/staking/hooks'
import styled from 'styled-components'
import { TYPE } from 'theme'
import { calcBoost } from 'utils/calcExpectedVeMobi'

import Logo from '../../components/Logo'
import { useStablePoolInfo } from '../../state/stablePools/hooks'
import ClaimAllMobiModal from './ClaimAllMobiModal'
import GaugeVoteModal from './GaugeVoteModal'

const Container = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  background: ${({ theme }) => theme.bg1};
  border-radius: 1rem;
  margin-bottom: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%
`}
`
const SmallButton = styled(ButtonOutlined)`
  padding: 0.5rem;
  width: 8rem;
  border-color: ${({ theme }) => theme.primary1};
`
const Wrapper = styled(AutoColumn)<{ showBackground: boolean; bgColor: any }>`
  width: 100%;
  overflow: hidden;
  position: relative;
  margin-bottom: 1rem;
  padding: 1rem;
  overflow: hidden;
  position: relative;
  background: ${({ theme }) => theme.bg1};
  ${({ theme }) => theme.mediaWidth.upToSmall`
    box-shadow: 1px 1px 3px ${({ theme }) => theme.bg4};
    border-radius: 10px;

`}
  &:hover {
    opacity: 1;
  }
`

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  background-color: ${({ theme }) => theme.white};
`
const Divider = styled.div`
  width: 100%;
  height: 1px;
  margin: 0;
  background: ${({ theme }) => theme.bg4};
`

type PositionsProps = {
  stakingInfo: MobiStakingInfo
  unclaimedMobi: TokenAmount
}
export default function Positions({ stakingInfo, unclaimedMobi }: PositionsProps) {
  const { positions = [] } = stakingInfo
  const loading = positions.length === 0
  const greaterThanZero = positions.filter(
    ({ baseBalance, unclaimedMobi }) => baseBalance.greaterThan('0') || unclaimedMobi.greaterThan('0')
  )
  const [openModal, setOpenModal] = useState(false)
  return (
    <Container>
      <ClaimAllMobiModal
        isOpen={openModal}
        onDismiss={() => setOpenModal(false)}
        summaries={greaterThanZero.filter(({ unclaimedMobi }) => unclaimedMobi.greaterThan('0'))}
      />
      <RowBetween style={{ marginBottom: '1rem' }}>
        <TYPE.largeHeader>Your Positions</TYPE.largeHeader>
        <TYPE.green
          style={{ paddingLeft: '.15rem', textAlign: 'right' }}
          className="apr"
          fontWeight={800}
          fontSize={[18, 24]}
        >
          {unclaimedMobi.toSignificant(4)} Unclaimed MOBI
        </TYPE.green>
      </RowBetween>
      {loading ? (
        <AutoRow>
          <Loader style={{ margin: 'auto' }} />
        </AutoRow>
      ) : (
        greaterThanZero.map((position) => (
          <PositionCard
            key={`positions-card-${position.pool}`}
            position={position}
            votingPower={stakingInfo.votingPower.raw}
            totalVotingPower={stakingInfo.totalVotingPower.raw}
          />
        ))
      )}
      {JSBI.greaterThan(unclaimedMobi.raw, JSBI.BigInt(0)) && (
        <ButtonPrimary
          onClick={() => setOpenModal(true)}
          style={{ fontWeight: 700, fontSize: 18, marginBottom: '1rem' }}
        >
          CLAIM MOBI
        </ButtonPrimary>
      )}
    </Container>
  )
}

function PositionCard({
  position,
  votingPower,
  totalVotingPower,
}: {
  position: GaugeSummary
  votingPower: JSBI
  totalVotingPower: JSBI
}) {
  const lpAsUsd = usePriceOfLp(position.poolAddress, position.baseBalance)
  const [voteModalOpen, setVoteModalOpen] = useState(false)
  const boost = calcBoost(position, votingPower, totalVotingPower)

  const stablePools = useStablePoolInfo()
  const poolInfo = stablePools.filter((x) => x.name === position.pool)[0]
  const poolColor = usePoolColor(poolInfo)
  const [expand, setExpand] = useState(false)

  const mobileView = (
    <div>
      <RowBetween>
        <RowFixed style={{ gap: '10px' }}>
          <StyledLogo size={'32px'} srcs={[ChainLogo[poolInfo.displayChain]]} alt={'logo'} />
          <TYPE.mediumHeader>{position.pool}</TYPE.mediumHeader>
        </RowFixed>
        {expand ? <ChevronUp /> : <ChevronDown />}
      </RowBetween>
      {expand && (
        <div style={{ width: '100%', display: 'flex' }}>
          <TYPE.darkGray style={{ width: '100%', textAlign: 'right' }} fontSize={20}>
            {`Value: $${lpAsUsd?.toSignificant(4)}`}
          </TYPE.darkGray>
          <TYPE.subHeader
            style={{ alignContent: 'right', alignItems: 'right', textAlign: 'right' }}
            color={poolColor}
            className="apr"
            fontWeight={800}
            fontSize={[18, 24]}
          >
            {`Boost: ${boost.greaterThan(JSBI.BigInt(0)) ? boost.toFixed(2) : '1'}x`}
          </TYPE.subHeader>
        </div>
      )}
    </div>
    // <RowBetween>
    // <RowFixed style={{ gap: '10px' }}>
    //   <StyledLogo size={'32px'} srcs={[ChainLogo[poolInfo.displayChain]]} alt={'logo'} />
    //   <TYPE.mediumHeader>{position.pool}</TYPE.mediumHeader>
    //   <TYPE.darkGray fontSize={20}>{`$${lpAsUsd?.toSignificant(4)}`}</TYPE.darkGray>
    //  </RowFixed>
    // <TYPE.subHeader
    //   style={{ alignContent: 'right', alignItems: 'right', textAlign: 'right' }}
    //   color={poolColor}
    //   className="apr"
    //   fontWeight={800}
    //   fontSize={[18, 24]}
    // >
    //   {`${boost.greaterThan(JSBI.BigInt(0)) ? boost.toFixed(2) : '1'}x`}
    // </TYPE.subHeader>
    // </RowBetween>
  )

  return (
    <>
      <GaugeVoteModal summary={position} isOpen={voteModalOpen} onDismiss={() => setVoteModalOpen(false)} />

      <Wrapper showBackground={true} bgColor={poolColor} onClick={() => setExpand(!expand)}>
        <CardNoise />
        {isMobile ? (
          mobileView
        ) : (
          <RowBetween>
            <RowFixed style={{ gap: '10px' }}>
              <StyledLogo size={'32px'} srcs={[ChainLogo[poolInfo.displayChain]]} alt={'logo'} />
              <TYPE.mediumHeader>{position.pool}</TYPE.mediumHeader>
              <TYPE.darkGray fontSize={20}>{`  -  $${lpAsUsd?.toSignificant(4)}`}</TYPE.darkGray>
            </RowFixed>
            <TYPE.subHeader
              style={{ alignContent: 'right', alignItems: 'right', textAlign: 'right' }}
              color={poolColor}
              className="apr"
              fontWeight={800}
              fontSize={[18, 24]}
            >
              {`${boost.greaterThan(JSBI.BigInt(0)) ? boost.toFixed(2) : '1'}x`}
            </TYPE.subHeader>
          </RowBetween>
        )}{' '}
      </Wrapper>
    </>
  )
}
