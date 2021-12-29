import { cUSD, Fraction, JSBI, Percent, Price, TokenAmount } from '@ubeswap/sdk'
import QuestionHelper from 'components/QuestionHelper'
import { ChainLogo, Coins } from 'constants/StablePools'
import { useActiveContractKit } from 'hooks'
import { useMobi } from 'hooks/Tokens'
import { darken } from 'polished'
import React, { useState } from 'react'
import { isMobile } from 'react-device-detect'
import { useHistory } from 'react-router'
import { NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { getDepositValues } from 'utils/stableSwaps'
import { getCUSDPrices, useCUSDPrice } from 'utils/useCUSDPrice'

import { BIG_INT_SECONDS_IN_WEEK, BIG_INT_SECONDS_IN_YEAR } from '../../constants'
import { useColor, usePoolColor } from '../../hooks/useColor'
import { useTokenPrices, useWalletModalToggle } from '../../state/application/hooks'
import { StablePoolInfo } from '../../state/stablePools/hooks'
import { theme, TYPE } from '../../theme'
import { ButtonPrimary } from '../Button'
import { AutoColumn } from '../Column'
import CurrencyPoolLogo from '../CurrencyPoolLogo'
import Logo from '../Logo'
import { Row, RowBetween, RowFixed } from '../Row'
import DepositModal from './DepositModal'
import WithdrawModal from './WithdrawModal'

const StyledButton = styled(ButtonPrimary)<{ background: any; backgroundHover: any; eth: boolean }>`
  background: ${({ background }) => background};
  flex: 0.6;
  &:hover {
    background: ${({ background }) => darken(0.1, background)};
  }
  color: ${({ theme, eth }) => eth && theme.text6};
`

const StatContainer = styled.div<{ isOpen: boolean }>`
  width: ${({ isOpen }) => (isOpen ? '100%' : '45%')};
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1rem;
  margin-right: 1rem;
  margin-left: 1rem;
  ${({ theme }) => theme.mediaWidth.upToSmall`;
`};
`

const InfoContainer = styled.div`
  display: flex;
  align-items: flex-end;
  width: 100%;
  padding: 0px;
  margin-top: 16px;
`
const Bottom = styled.div`
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding-left: 1rem;
  padding-right: 1rem;
`

const Wrapper = styled(AutoColumn)<{ showBackground: boolean; background: any }>`
  border-radius: 20px;
  width: 100%;
  overflow: hidden;
  position: relative;
  padding: 1rem;
  background: ${({ theme }) => theme.bg1};
  color: ${({ theme }) => theme.text1} !important;
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
  ${({ theme }) => theme.mediaWidth.upToSmall`
  padding-left: 0.25rem;
  padding-right: 0.25rem;
  max-width: 420px;
`}
`

const TopSection = styled.div`
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
const SecondSection = styled.div`
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

const StyledLogo = styled(Logo)<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  border-radius: ${({ size }) => size};
  box-shadow: 0px 6px 10px rgba(0, 0, 0, 0.075);
  background-color: ${({ theme }) => theme.white};
`

const DepositWithdrawBtn = styled(StyledButton)<{ background: string; backgroundHover: string }>`
  display: flex;
`

const ExpandedRow = styled(Row)<{ open: boolean }>`
  justify-content: ${({ open }) => !open && 'space-between'};
  width: 100%;
`

const StyledNavLink = styled(NavLink)<{ color: string }>`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: left;
  border-radius: 3rem;
  outline: none;
  cursor: pointer;
  color: ${({ color }) => color};
  font-size: 20;
  width: fit-content;
  font-weight: 800;
  paddingLeft: '.15rem',
  textDecoration: underline,
`

export function calcApy(rewardPerYear: Fraction, totalStakedAmount: Fraction) {
  const apyFraction = rewardPerYear
    .multiply(JSBI.exponentiate(JSBI.BigInt('10'), JSBI.BigInt('18')))
    .divide(totalStakedAmount)

  const apy = apyFraction
    ? new Percent(
        apyFraction.numerator,
        JSBI.multiply(apyFraction.denominator, JSBI.exponentiate(JSBI.BigInt('10'), JSBI.BigInt('18')))
      )
    : undefined

  const dpy = apy
    ? new Percent(Math.floor(parseFloat(apy.divide('365').toFixed(10)) * 1_000_000).toFixed(0), '1000000')
    : undefined
  return [apyFraction, apy, dpy]
}

interface Props {
  poolInfo: StablePoolInfo
}

export const StablePoolCard: React.FC<Props> = ({ poolInfo }: Props) => {
  const { account, chainId } = useActiveContractKit()
  const {
    tokens,
    peggedTo,
    balances,
    totalDeposited,
    stakedAmount,
    workingSupply,
    pegComesAfter,
    feesGenerated,
    mobiRate,
    displayDecimals,
    totalStakedAmount: totalStakedLPs,
    coin,
  } = poolInfo

  const [openDeposit, setOpenDeposit] = useState(false)
  const [openWithdraw, setOpenWithdraw] = useState(false)
  const [openManage, setOpenManage] = useState(false)
  const tokenPrices = getCUSDPrices(useTokenPrices())
  const history = useHistory()

  const mobi = useMobi()
  const priceOfMobi = useCUSDPrice(mobi) ?? new Price(mobi, cUSD[chainId], '100', '1')
  const userLP = poolInfo.amountDeposited
  const { totalValueStaked, totalValueDeposited, valueOfDeposited } = getDepositValues(poolInfo, workingSupply)
  const coinPrice = tokens.reduce(
    (accum: Fraction | undefined, { address }) => accum ?? tokenPrices[address.toLowerCase()],
    undefined
  )

  const totalStakedAmount = totalValueStaked
    ? totalValueStaked.multiply(new Fraction(coinPrice?.numerator ?? '1', coinPrice?.denominator ?? '1'))
    : new Fraction(JSBI.BigInt(0))
  const totalMobiRate = new TokenAmount(mobi, mobiRate ?? JSBI.BigInt('0'))
  // let userMobiRate = new TokenAmount(mobi, JSBI.BigInt('0'))
  // if (account && mobiRate && totalStakedLPs && totalStakedLPs.greaterThan('0')) {
  //   userMobiRate = new TokenAmount(mobi, poolInfo.workingPercentage.multiply(mobiRate ?? '0').toFixed(0))
  // }
  // let userExternalRates: TokenAmount[] = []
  // if (account && poolInfo.externalRewardRates && totalStakedLPs && totalStakedLPs.greaterThan('0')) {
  //   userExternalRates = poolInfo.externalRewardRates.map(
  //     (rate) => new TokenAmount(rate.token, poolInfo.workingPercentage.multiply(rate.raw).toFixed(0))
  //   )
  // }
  const rewardPerYear = priceOfMobi.raw.multiply(totalMobiRate.multiply(BIG_INT_SECONDS_IN_YEAR))
  let rewardPerYearExternal = new Fraction('0', '1')
  for (let i = 0; i < 8; i++) {
    const rate = poolInfo.externalRewardRates?.[i] ?? totalMobiRate
    const priceOfToken =
      tokenPrices[rate.token.address.toLowerCase()] ?? tokenPrices['0x00be915b9dcf56a3cbe739d9b9c202ca692409ec']
    if (poolInfo.externalRewardRates && i < poolInfo.externalRewardRates.length) {
      rewardPerYearExternal = rewardPerYearExternal.add(
        priceOfToken?.multiply(rate.multiply(BIG_INT_SECONDS_IN_YEAR)) ?? '0'
      )
    }
  }
  const [apyFraction, apy, dpy] =
    mobiRate && totalStakedAmount && !totalStakedAmount.equalTo(JSBI.BigInt(0))
      ? calcApy(rewardPerYear.add(rewardPerYearExternal), totalStakedAmount)
      : [undefined, undefined, undefined]

  const [boostedApyFraction, boostedApy, boostedDpy] =
    mobiRate && totalStakedAmount && !totalStakedAmount.equalTo(JSBI.BigInt(0))
      ? calcApy(
          rewardPerYear.multiply(new Fraction(JSBI.BigInt(5), JSBI.BigInt(2))).add(rewardPerYearExternal),
          totalStakedAmount
        )
      : [new Fraction('0', '1'), new Fraction('0', '1'), new Fraction('0', '1')]

  let weeklyAPY: React.ReactNode | undefined = <>🤯</>
  try {
    weeklyAPY = apy
      ? new Percent(
          Math.floor(parseFloat(apy.divide('52').add('1').toFixed(10)) ** 52 * 1_000_000 - 1_000_000).toFixed(0),
          '1000000'
        ).toFixed(0, { groupSeparator: ',' })
      : undefined
  } catch (e) {
    console.error('Weekly apy overflow', e)
  }
  let userBalances: TokenAmount[] = []
  if (totalDeposited.greaterThan('0')) {
    userBalances = balances.map((amount) => {
      const fraction = new Fraction(userLP ? userLP.raw : JSBI.BigInt(0), totalDeposited.raw)
      const ratio = fraction.multiply(amount.raw)
      return new TokenAmount(amount.currency, JSBI.divide(ratio.numerator, ratio.denominator))
    })
  }
  const totalVolume = new TokenAmount(poolInfo.lpToken, JSBI.multiply(feesGenerated.raw, JSBI.BigInt('1000')))

  // get the color of the token
  const backgroundColorStart = useColor(tokens[0])
  let backgroundColorEnd = useColor(tokens[tokens.length - 1])
  const poolColor = usePoolColor(poolInfo)
  const backgroundGradient = null //generateGradient(tokens.slice())

  if (!backgroundColorEnd || backgroundColorEnd === backgroundColorStart) backgroundColorEnd = '#212429'

  // get the USD value of staked WETH
  // const apyFraction = poolInfo.apr || undefined
  // const apy = apyFraction ? new Percent(apyFraction.numerator, apyFraction.denominator) : undefined
  const isStaking = valueOfDeposited.greaterThan(JSBI.BigInt('0')) || poolInfo.stakedAmount.greaterThan('0')

  const formatNumber = (num: string) => {
    return num.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
  }
  const toggleWalletModal = useWalletModalToggle()

  const totalDisplay = (amount: TokenAmount): string => {
    if (coin === Coins.Bitcoin || coin === Coins.Ether) {
      if (JSBI.lessThan(amount.raw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(19))) || openManage) {
        return amount.toFixed(2)
      } else return amount.toFixed(0)
    } else {
      if (JSBI.lessThan(amount.raw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(23))) || openManage) {
        return formatNumber(amount.toFixed(0))
      } else {
        const collapsed = JSBI.divide(amount.raw, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(23))).toString()
        return formatNumber(String((Number(collapsed) / 10).toFixed(1))).concat('M')
      }
    }
  }

  return (
    <Wrapper
      showBackground={true}
      background={backgroundGradient}
      bgColor1={backgroundColorStart}
      bgColor2={backgroundColorEnd}
      onClick={() => setOpenManage(!openManage)}
    >
      {openDeposit && <DepositModal isOpen={openDeposit} onDismiss={() => setOpenDeposit(false)} poolInfo={poolInfo} />}
      {openWithdraw && (
        <WithdrawModal isOpen={openWithdraw} onDismiss={() => setOpenWithdraw(false)} poolInfo={poolInfo} />
      )}
      <TopSection>
        <RowFixed style={{ gap: '10px' }}>
          <TYPE.black fontWeight={600} fontSize={[18, 24]}>
            {poolInfo.name}
          </TYPE.black>
          <StyledLogo size={'32px'} srcs={[ChainLogo[poolInfo.displayChain]]} alt={'logo'} />
        </RowFixed>
        {apy ? (
          <RowFixed>
            <QuestionHelper
              text={
                <>
                  Yield/day: {dpy?.toSignificant(4)}%<br />
                  APY (weekly compounded): {weeklyAPY}%
                </>
              }
            />
            <TYPE.subHeader
              style={{ alignContent: 'right', alignItems: 'right' }}
              color={poolColor}
              className="apr"
              fontWeight={800}
              fontSize={[16, 24]}
              textAlign="right"
            >
              {apy.denominator.toString() !== '0' ? `${apy.toFixed(1, { groupSeparator: ',' })}%` : ' -'} APR
            </TYPE.subHeader>
          </RowFixed>
        ) : (
          feesGenerated && (
            <TYPE.subHeader color={backgroundColorStart} className="apr" fontWeight={800} fontSize={[14, 18]}>
              Fees Generated: {pegComesAfter ? '' : peggedTo}
              {feesGenerated.denominator.toString() !== '0'
                ? `${feesGenerated.toFixed(displayDecimals, { groupSeparator: ',' })}`
                : '-'}
              {pegComesAfter ? peggedTo : ''}
            </TYPE.subHeader>
          )
        )}
      </TopSection>
      <SecondSection>
        <RowFixed>
          <CurrencyPoolLogo tokens={tokens.slice()} size={24} margin={true} />
          <TYPE.darkGray fontWeight={450} fontSize={[14, 20]}>
            {tokens.map((t) => t.symbol).join(' / ')}
          </TYPE.darkGray>
          {poolInfo.meta && (
            <QuestionHelper
              text={
                <>
                  A meta pool pairs one token with the LP token of another pool to build on already-existing liquidity.{' '}
                  <br />
                  <br />
                  This meta pool builds off of {poolInfo.meta}
                </>
              }
            />
          )}
        </RowFixed>
        {apy ? (
          <RowFixed>
            <StyledNavLink
              style={{ fontSize: 15, textAlign: 'right' }}
              color={poolColor}
              to={'/stake'}
              className="bapr"
            >
              up to {apy.denominator.toString() !== '0' ? `${boostedApy.toFixed(1, { groupSeparator: ',' })}%` : ' -'}{' '}
              w/ boost
            </StyledNavLink>
          </RowFixed>
        ) : feesGenerated ? (
          <TYPE.subHeader color={backgroundColorStart} className="apr" fontWeight={800} fontSize={[14, 18]}>
            Fees Generated: {pegComesAfter ? '' : peggedTo}
            {feesGenerated.denominator.toString() !== '0'
              ? `${feesGenerated.toFixed(displayDecimals, { groupSeparator: ',' })}`
              : '-'}
            {pegComesAfter ? peggedTo : ''}
          </TYPE.subHeader>
        ) : (
          <TYPE.black fontWeight={600} fontSize={[14, 18]}>
            Coming Soon!
          </TYPE.black>
        )}
      </SecondSection>
      <InfoContainer>
        <div style={{ flex: 3, width: '100%' }}>
          <ExpandedRow open={openManage}>
            <StatContainer isOpen={openManage || isMobile}>
              <RowBetween>
                <TYPE.darkGray>Total deposited</TYPE.darkGray>
                <RowFixed>
                  <QuestionHelper
                    text={balances
                      .map(
                        (balance) =>
                          `${balance?.toFixed(displayDecimals, { groupSeparator: ',' })} ${balance.token.symbol}`
                      )
                      .join(', ')}
                  />
                  <TYPE.black fontWeight={800}>
                    {totalValueDeposited
                      ? `${!pegComesAfter ? peggedTo : ''}${totalDisplay(totalValueDeposited)} ${
                          pegComesAfter ? peggedTo : ''
                        }`
                      : '-'}
                  </TYPE.black>
                </RowFixed>
              </RowBetween>

              <RowBetween>
                <TYPE.darkGray>Total volume</TYPE.darkGray>
                <RowFixed>
                  <TYPE.black fontWeight={800}>
                    {totalVolume
                      ? `${!pegComesAfter ? peggedTo : ''}${totalDisplay(totalVolume)} ${pegComesAfter ? peggedTo : ''}`
                      : '-'}
                  </TYPE.black>
                </RowFixed>
              </RowBetween>

              {openManage && (
                <>
                  {mobiRate && (
                    <RowBetween>
                      <TYPE.darkGray>MOBI rate</TYPE.darkGray>
                      <TYPE.black fontWeight={800}>
                        {totalMobiRate
                          ? totalMobiRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' }) ?? '-'
                          : '0'}
                        {' / week'}
                      </TYPE.black>
                    </RowBetween>
                  )}
                  {poolInfo.externalRewardRates &&
                    poolInfo.externalRewardRates.map((rate) => (
                      <RowBetween key={rate.toExact()}>
                        <TYPE.darkGray>{rate.token.symbol?.toUpperCase()} rate</TYPE.darkGray>
                        <TYPE.black
                          fontWeight={800}
                          marginLeft="auto"
                          key={`additional-reward-total-${rate.currency.symbol}-${poolInfo.name}`}
                        >
                          {rate
                            ? rate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toSignificant(4, { groupSeparator: ',' }) ?? '-'
                            : '0'}
                          {` / week`}
                        </TYPE.black>
                      </RowBetween>
                    ))}
                  {!!account && isStaking && (
                    <RowBetween>
                      <TYPE.darkGray fontWeight={500}>Your share</TYPE.darkGray>
                      <RowFixed>
                        {/* <QuestionHelper
                        text={userBalances
                          .map(
                            (balance) =>
                              // eslint-disable-next-line prettier/prettier
                              `${balance?.toFixed(displayDecimals + 1, { groupSeparator: ',' })} ${
                                balance.token.symbol
                              }`
                          )
                          .join(', ')}
                      /> */}
                        <TYPE.black fontWeight={800}>
                          {!pegComesAfter && peggedTo}
                          {valueOfDeposited.toFixed(displayDecimals + 2)}
                          {pegComesAfter && ` ${peggedTo}`}
                        </TYPE.black>
                      </RowFixed>
                    </RowBetween>
                  )}
                </>
              )}
            </StatContainer>
            {!openManage && !isMobile && (
              <StyledButton
                background={poolColor}
                backgroundHover={poolColor}
                onClick={account ? () => (isStaking ? setOpenManage(true) : setOpenDeposit(true)) : toggleWalletModal}
                eth={coin === Coins.Ether}
                style={{
                  width: '10%',
                  fontWeight: 700,
                  fontSize: 18,
                  maxWidth: '150px',
                  marginTop: '-20px',
                }}
              >
                {isStaking ? 'MANAGE' : 'DEPOSIT'}
              </StyledButton>
            )}
          </ExpandedRow>
        </div>
      </InfoContainer>
      <Bottom>
        {!isStaking && (openManage || isMobile) && (
          <StyledButton
            background={poolColor}
            backgroundHover={poolColor}
            onClick={account ? () => setOpenDeposit(true) : toggleWalletModal}
            eth={coin === Coins.Ether}
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            DEPOSIT
          </StyledButton>
        )}
        {!!account && isStaking && (openManage || isMobile) && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease-in',
              gap: isMobile ? '0.25rem' : '1rem',
              flexWrap: 'wrap',
              padding: isMobile ? 0 : '1rem',
              paddingBottom: isMobile && '0',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <DepositWithdrawBtn
              background={theme(false).celoGreen}
              backgroundHover={theme(false).celoGreen}
              onClick={() => setOpenDeposit(true)}
              style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}
            >
              DEPOSIT
            </DepositWithdrawBtn>
            <DepositWithdrawBtn
              background={theme(false).celoRed}
              backgroundHover={theme(false).celoRed}
              onClick={() => setOpenWithdraw(true)}
              style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}
            >
              WITHDRAW
            </DepositWithdrawBtn>
            {poolInfo.gaugeAddress !== undefined && (
              <DepositWithdrawBtn
                background={theme(false).celoGold}
                backgroundHover={theme(false).celoGold}
                style={{ fontWeight: 700, fontSize: isMobile ? 15 : 18 }}
                onClick={() => history.push(`/farm/${poolInfo.name}`)}
              >
                FARM
              </DepositWithdrawBtn>
            )}
          </div>
        )}
      </Bottom>
    </Wrapper>
  )
}
