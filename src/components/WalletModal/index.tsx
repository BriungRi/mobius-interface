import { useContractKit } from '@celo-tools/use-contractkit'
import { AbstractConnector } from '@web3-react/abstract-connector'
import { UnsupportedChainIdError, useWeb3React } from '@web3-react/core'
import React, { useEffect, useState } from 'react'
import { isMobile } from 'react-device-detect'
import ReactGA from 'react-ga'
import styled from 'styled-components'

import { ReactComponent as Close } from '../../assets/images/x.svg'
import { SUPPORTED_WALLETS } from '../../constants'
import usePrevious from '../../hooks/usePrevious'
import { ApplicationModal } from '../../state/application/actions'
import { useModalOpen, useWalletModalToggle } from '../../state/application/hooks'
import { ExternalLink } from '../../theme'
import AccountDetails from '../AccountDetails'
import Modal from '../Modal'
import { CeloConnector } from './CeloConnector'
import { LedgerWalletSelector } from './LedgerWalletSelector'
import PendingView from './PendingView'

const CloseIcon = styled.div`
  position: absolute;
  right: 1rem;
  top: 14px;
  &:hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const CloseColor = styled(Close)`
  path {
    stroke: ${({ theme }) => theme.text4};
  }
`

const Wrapper = styled.div`
  ${({ theme }) => theme.flexColumnNoWrap}
  margin: 0;
  padding: 0;
  width: 100%;
`

const HeaderRow = styled.div`
  ${({ theme }) => theme.flexRowNoWrap};
  padding: 1rem 1rem;
  font-weight: 500;
  color: ${(props) => (props.color === 'blue' ? ({ theme }) => theme.primary1 : 'inherit')};
  ${({ theme }) => theme.mediaWidth.upToMedium`
    padding: 1rem;
  `};
`

const ContentWrapper = styled.div`
  background-color: ${({ theme }) => theme.bg2};
  padding: 2rem;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;

  ${({ theme }) => theme.mediaWidth.upToMedium`padding: 1rem`};
`

const UpperSection = styled.div`
  position: relative;

  h5 {
    margin: 0;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    font-weight: 400;
  }

  h5:last-child {
    margin-bottom: 0px;
  }

  h4 {
    margin-top: 0;
    font-weight: 500;
  }
`

const Blurb = styled.div`
  ${({ theme }) => theme.flexRowNoWrap}
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    margin: 1rem;
    font-size: 12px;
  `};
`

const OptionGrid = styled.div`
  display: grid;
  grid-gap: 10px;
  ${({ theme }) => theme.mediaWidth.upToMedium`
    grid-template-columns: 1fr;
    grid-gap: 10px;
  `};
`

const HoverText = styled.div`
  :hover {
    cursor: pointer;
  }
`

const WALLET_VIEWS = {
  OPTIONS_SECONDARY: 'options_secondary',
  ACCOUNT: 'account',
  PENDING: 'pending',
  LEDGER: 'ledger',
}

export default function WalletModal({
  pendingTransactions,
  confirmedTransactions,
  ENSName,
}: {
  pendingTransactions: string[] // hashes of pending
  confirmedTransactions: string[] // hashes of confirmed
  ENSName?: string
}) {
  // important that these are destructed from the account-specific web3-react context
  const { error } = useWeb3React()
  const { connect, address } = useContractKit()

  const [walletView, setWalletView] = useState(WALLET_VIEWS.ACCOUNT)

  const [pendingWallet, setPendingWallet] = useState<AbstractConnector | undefined>()

  const [pendingError, setPendingError] = useState<boolean>()
  const [activateError, setActivateError] = useState<string | null>(null)

  const walletModalOpen = useModalOpen(ApplicationModal.WALLET)
  const toggleWalletModal = useWalletModalToggle()

  const previousAccount = usePrevious(address)

  // close on connection, when logged out before
  useEffect(() => {
    if (address && !previousAccount && walletModalOpen) {
      toggleWalletModal()
    }
  }, [address, previousAccount, toggleWalletModal, walletModalOpen])

  // always reset to account view
  useEffect(() => {
    if (walletModalOpen) {
      setPendingError(false)
      setWalletView(WALLET_VIEWS.ACCOUNT)
    }
  }, [walletModalOpen])

  const tryActivation = async (connector: AbstractConnector | undefined) => {
    let name = ''
    Object.keys(SUPPORTED_WALLETS).map((key) => {
      if (connector === SUPPORTED_WALLETS[key].connector) {
        return (name = SUPPORTED_WALLETS[key].name)
      }
      return true
    })
    // log selected wallet
    ReactGA.event({
      category: 'Wallet',
      action: 'Change Wallet',
      label: name,
    })
    setPendingWallet(connector) // set wallet for pending view
    setWalletView(WALLET_VIEWS.PENDING)

    await connect().catch((error) => {
      console.log('[Activation error]', error)
      setActivateError(error.message)
      setPendingError(true)
    })
  }

  function getModalContent() {
    if (error) {
      return (
        <UpperSection>
          <CloseIcon onClick={toggleWalletModal}>
            <CloseColor />
          </CloseIcon>
          <HeaderRow>
            {error instanceof UnsupportedChainIdError ? 'Wrong Network' : activateError ?? 'Error connecting'}
          </HeaderRow>
          <ContentWrapper>
            {error instanceof UnsupportedChainIdError ? (
              <div>
                <h5>Please connect to the appropriate Celo network.</h5>
                <br />
                <CeloConnector />
              </div>
            ) : (
              'Error connecting. Try refreshing the page.'
            )}
          </ContentWrapper>
        </UpperSection>
      )
    }
    if (address && walletView === WALLET_VIEWS.ACCOUNT) {
      return (
        <AccountDetails
          toggleWalletModal={toggleWalletModal}
          pendingTransactions={pendingTransactions}
          confirmedTransactions={confirmedTransactions}
          ENSName={ENSName}
          openOptions={connect}
        />
      )
    }
    return (
      <UpperSection>
        <CloseIcon onClick={toggleWalletModal}>
          <CloseColor />
        </CloseIcon>
        {walletView !== WALLET_VIEWS.ACCOUNT ? (
          <HeaderRow color="blue">
            <HoverText
              onClick={() => {
                setPendingError(false)
                setWalletView(WALLET_VIEWS.ACCOUNT)
              }}
            >
              Back
            </HoverText>
          </HeaderRow>
        ) : (
          <HeaderRow>
            <HoverText>Connect to a wallet</HoverText>
          </HeaderRow>
        )}
        <ContentWrapper>
          {walletView === WALLET_VIEWS.PENDING ? (
            <PendingView
              connector={pendingWallet}
              error={pendingError}
              setPendingError={setPendingError}
              activateError={activateError}
              tryActivation={tryActivation}
            />
          ) : walletView === WALLET_VIEWS.LEDGER ? (
            <LedgerWalletSelector tryActivation={tryActivation} />
          ) : (
            <OptionGrid>test</OptionGrid>
          )}
          {walletView !== WALLET_VIEWS.PENDING && walletView !== WALLET_VIEWS.LEDGER && (
            <>
              {!isMobile && (
                <Blurb>
                  <ExternalLink href="https://docs.ubeswap.org/wallet-support/wallets">
                    Learn more about Celo wallets
                  </ExternalLink>
                </Blurb>
              )}
              {isMobile && (
                <Blurb>
                  <span>New to Celo? &nbsp;</span>
                  <ExternalLink href="https://docs.ubeswap.org/wallet-support/wallets">
                    Learn more about wallets
                  </ExternalLink>
                </Blurb>
              )}
            </>
          )}
        </ContentWrapper>
      </UpperSection>
    )
  }

  return (
    <Modal isOpen={walletModalOpen} onDismiss={toggleWalletModal} minHeight={false} maxHeight={90}>
      <Wrapper>{getModalContent()}</Wrapper>
    </Modal>
  )
}
