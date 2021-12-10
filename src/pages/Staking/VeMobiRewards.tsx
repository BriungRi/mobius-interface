import { TransactionResponse } from '@ethersproject/abstract-provider'
import { ButtonEmpty } from 'components/Button'
import { AutoColumn, ColumnCenter } from 'components/Column'
import Loader from 'components/Loader'
import { RowFixed } from 'components/Row'
import { useActiveContractKit } from 'hooks'
import { useStakingContract } from 'hooks/useContract'
import React, { useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useSNXRewardInfo } from 'state/staking/hooks'
import { useTransactionAdder } from 'state/transactions/hooks'
import styled from 'styled-components'
import { TYPE } from 'theme'

import Logo from '../../components/Logo'

const Wrapper = styled(AutoColumn)`
  border-radius: 12px;
  gap: 1rem;
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 1rem;
  padding-left: 0rem;
  padding-right: 0rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: ${({ theme }) => theme.text1} !important;
  ${({ theme }) => theme.mediaWidth.upToSmall`
`}
`

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  justify-self: center;
  width: 100%;
  max-width: 720px;
`
const PositionWrapper = styled(AutoColumn)`
  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  border-radius: 20px;
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 1rem;
  opacity: 1;
  background: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.text1} !important;
  ${({ theme }) => theme.mediaWidth.upToSmall`
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  padding-top: 1rem;
  margin-top: 1rem;
  overflow: hidden;
`}
`

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  background-color: ${({ theme }) => theme.white};
`

const SecondSection = styled.div<{ mobile: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  padding-bottom: 0.25rem;
  padding-top: 0;
  z-index: 1;
  width: 100%;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`
const TopSection = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  padding-bottom: 0.25rem;
  padding-top: 0;
  z-index: 1;
  ${({ theme }) => theme.mediaWidth.upToSmall`
    grid-template-columns: 48px 1fr 96px;
  `};
`

const Divider = styled.div`
  width: 100%;
  height: 1px;
  margin-left: auto;
  margin-right: auto;
  margin-top: 1rem;
  margin-bottom: 1rem;
  background: ${({ theme }) => theme.text1};
  opacity: 0.5;
`

const StyledButton = styled(ButtonEmpty)`
  margin-left: auto;
  margin-right: 0.5rem;
`

export default function VeMobiRewards() {
  const { rewardToken, rewardRate, avgApr, userRewardRate, leftToClaim, snxAddress } = useSNXRewardInfo()
  const tokenColor = '#ab9325' //useColor(rewardToken)
  const { account } = useActiveContractKit()
  const stakingContract = useStakingContract(snxAddress)
  const addTransaction = useTransactionAdder()
  const [attempting, setAttempting] = useState(false)
  const [hash, setHash] = useState<string>()

  async function onClaimReward() {
    if (stakingContract) {
      setAttempting(true)
      setHash(undefined)
      await stakingContract
        .getReward()
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            summary: `Claimed accumulated Celo rewards from veMOBI`,
          })
          response.wait().then(() => setHash(response.hash))
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  return !rewardRate || !avgApr ? (
    <Wrapper>
      <Loader />
    </Wrapper>
  ) : (
    <Wrapper>
      <TYPE.darkGray>Earn Rewards Just for Staking MOBI</TYPE.darkGray>
      <TYPE.darkGray>
        Average APR is calculated by total celo rate / total MOBI locked, actual APR will vary based on lock duration
      </TYPE.darkGray>
      <TYPE.darkGray>
        To begin earning, simply lock Mobi on the {'"Lock"'} tab! If you have already locked MOBI then you are good to
        go.
      </TYPE.darkGray>
      <CardContainer>
        <PositionWrapper>
          <TopSection>
            <RowFixed style={{ gap: '6px' }}>
              <TYPE.black fontWeight={600} fontSize={[16, 24]}>
                {`${rewardToken.symbol} Rewards`}
              </TYPE.black>
            </RowFixed>
            <RowFixed>
              <TYPE.subHeader color={tokenColor} className="apr" fontWeight={800} fontSize={[16, 24]} textAlign="right">
                {`Average APR: ${avgApr.toFixed(2)}%`}
              </TYPE.subHeader>
            </RowFixed>
          </TopSection>
          <SecondSection mobile={isMobile}>
            <RowFixed style={{ marginTop: 10 }}>
              {/* <StyledLogo srcs={[rewardToken.logoURI]} size={'24'} /> */}
              <TYPE.darkGray fontWeight={450} fontSize={[15, 20]}>
                {`${rewardToken.symbol} Rate: `}
              </TYPE.darkGray>
            </RowFixed>

            <TYPE.black
              textAlign="right"
              fontSize={[13, 16]}
              fontWeight={800}
              color={tokenColor}
            >{`${rewardRate.toSignificant(4, { groupSeparator: ',' })} ${rewardToken.symbol} / WEEK`}</TYPE.black>
          </SecondSection>
          <SecondSection mobile={isMobile}>
            <RowFixed style={{ marginTop: 10 }}>
              {/* <StyledLogo srcs={[rewardToken.logoURI]} size={'24'} /> */}
              <TYPE.darkGray fontWeight={450} fontSize={[15, 20]}>
                {`Your Rate: `}
              </TYPE.darkGray>
            </RowFixed>

            <TYPE.black
              textAlign="right"
              fontSize={[13, 16]}
              fontWeight={800}
              color={tokenColor}
            >{`${userRewardRate.toSignificant(4, { groupSeparator: ',' })} ${rewardToken.symbol} / WEEK`}</TYPE.black>
          </SecondSection>
          <Divider />
          {attempting && !hash ? (
            <ColumnCenter style={{ height: 'fit-content' }}>
              <Loader size={'5rem'} />
              <TYPE.largeHeader marginTop="1rem">{`Claiming ${leftToClaim?.toFixed(2)} CELO`}</TYPE.largeHeader>
            </ColumnCenter>
          ) : (
            <>
              <StyledButton padding="8px" borderRadius="8px" width="fit-content" onClick={onClaimReward}>
                Claim
              </StyledButton>
              <SecondSection>
                <TYPE.largeHeader>Available to Claim: </TYPE.largeHeader>
                {leftToClaim ? (
                  <TYPE.largeHeader>{`${leftToClaim.toSignificant(4, { groupSeparator: ',' })} ${
                    rewardToken.symbol
                  }`}</TYPE.largeHeader>
                ) : account ? (
                  <Loader />
                ) : (
                  <TYPE.red>Connect Wallet</TYPE.red>
                )}
              </SecondSection>{' '}
            </>
          )}
        </PositionWrapper>
      </CardContainer>
    </Wrapper>
  )
}
