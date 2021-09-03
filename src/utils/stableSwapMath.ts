import { BigintIsh, JSBI } from '@ubeswap/sdk'
import { StableSwapMathConstants, StableSwapVariable } from 'state/stablePools/reducer'

const ZERO = JSBI.BigInt(0)
const ONE = JSBI.BigInt(1)
const TWO = JSBI.BigInt(2)
export class StableSwapMath {
  public readonly RATES: JSBI[]
  public readonly LENDING_PRECISION: JSBI
  public readonly PRECISION: JSBI
  public readonly FEE_DENOMINATOR: JSBI
  public readonly PRECISION_MUL: JSBI[]
  public readonly N_COINS: number
  public readonly FEE_INDEX: number
  public readonly DECIMALS: JSBI[]
  public readonly POOL_PRECISION_DECIMALS = JSBI.BigInt('18')
  public readonly tokenPrecisionMultipliers: JSBI[]
  public readonly MAX_LOOP_LIMIT = 256
  public readonly A_PRECISION = JSBI.BigInt('100')

  public lpTotalSupply: JSBI
  public swapFee: JSBI
  public currentWithdrawFee: JSBI
  public balances: JSBI[]
  public amp: JSBI
  public D: JSBI | undefined
  public xp: JSBI[] | undefined
  public aPrecise: JSBI

  constructor({
    rates,
    lendingPrecision,
    precision,
    feeDenominator,
    precisionMul,
    feeIndex,
    decimals,
    amp,
    balances,
    lpTotalSupply,
    swapFee,
    aPrecise,
  }: StableSwapMathConstants & StableSwapVariable) {
    this.RATES = rates
    this.LENDING_PRECISION = lendingPrecision
    this.PRECISION = precision
    this.FEE_DENOMINATOR = feeDenominator
    this.PRECISION_MUL = precisionMul
    this.N_COINS = rates.length
    this.FEE_INDEX = feeIndex
    this.DECIMALS = decimals
    const tokenPrecisionMultipliers = decimals.map((deci) =>
      JSBI.exponentiate(JSBI.BigInt('10'), JSBI.subtract(this.POOL_PRECISION_DECIMALS, deci))
    )

    this.tokenPrecisionMultipliers = tokenPrecisionMultipliers

    this.currentWithdrawFee = ZERO
    this.swapFee = ONE
    this.amp = ONE
    this.balances = Array(this.N_COINS).fill(ZERO)
    this.lpTotalSupply = ONE
    this.aPrecise = aPrecise
    this.updateInfo(swapFee, amp, balances, lpTotalSupply)
  }

  updateInfo(swapFee: JSBI, amp: JSBI, balances: JSBI[], lpTotalSupply: JSBI) {
    this.swapFee = swapFee
    this.amp = amp
    this.balances = balances
    this.lpTotalSupply = lpTotalSupply
  }

  calc_xp_mem(balances: BigintIsh[]): JSBI[] {
    const xp: JSBI[] = new Array(this.N_COINS)
    for (let i = 0; i < this.N_COINS; i += 1) {
      xp[i] = JSBI.multiply(JSBI.BigInt(balances[i].toString()), this.tokenPrecisionMultipliers[i])
    }
    this.xp = xp
    return xp
  }

  calc_xp(): JSBI[] {
    return this.calc_xp_mem(this.balances)
  }

  calc_D_xp(xp: JSBI[], amp: JSBI): JSBI {
    // const S = xp.reduce((accum, cur) => JSBI.add(accum, cur))
    const N_COINS = JSBI.BigInt(this.N_COINS)
    let S = ZERO
    for (let i = 0; i < this.N_COINS; i += 1) {
      S = JSBI.add(S, xp[i])
    }
    if (JSBI.equal(S, ZERO)) return ZERO

    let Dprev = ZERO
    let D = S
    const na = JSBI.multiply(amp, N_COINS)

    for (let i = 0; i < 255; i++) {
      // const D_P = xp.reduce((accum, cur) => JSBI.divide(JSBI.multiply(accum, D), JSBI.multiply(cur, N_COINS)), D)
      let dP = D
      for (let j = 0; j < this.N_COINS; j += 1) {
        dP = JSBI.divide(JSBI.multiply(dP, D), JSBI.multiply(xp[j], N_COINS))
      }
      Dprev = D
      // const left = JSBI.multiply(JSBI.add(JSBI.multiply(Ann, S), JSBI.multiply(D_P, N_COINS)), D)
      const left = JSBI.multiply(
        JSBI.add(JSBI.divide(JSBI.multiply(na, S), this.A_PRECISION), JSBI.multiply(dP, N_COINS)),
        D
      )

      const right = JSBI.add(
        JSBI.divide(JSBI.multiply(JSBI.subtract(na, this.A_PRECISION), D), this.A_PRECISION),
        JSBI.multiply(JSBI.add(N_COINS, ONE), dP)
      )

      D = JSBI.divide(left, right)

      if (JSBI.greaterThan(D, Dprev)) {
        if (JSBI.lessThanOrEqual(JSBI.subtract(D, Dprev), ONE)) {
          break
        }
      } else {
        if (JSBI.lessThanOrEqual(JSBI.subtract(Dprev, D), ONE)) {
          break
        }
      }
    }
    this.D = D
    return D
  }

  calc_D(): JSBI {
    return this.calc_D_xp(this.calc_xp_mem(this.balances), JSBI.multiply(this.amp, this.A_PRECISION))
  }

  getD(xp: JSBI[], amp: JSBI): JSBI {
    const N_COINS = JSBI.BigInt(this.N_COINS)
    let S = ZERO
    for (let i = 0; i < this.N_COINS; i += 1) {
      S = JSBI.add(S, xp[i])
    }
    if (JSBI.equal(S, ZERO)) return ZERO

    let Dprev = ZERO
    let D = S
    const na = JSBI.multiply(amp, N_COINS)

    for (let i = 0; i < 255; i++) {
      let dP = D
      for (let j = 0; j < this.N_COINS; j += 1) {
        dP = JSBI.divide(JSBI.multiply(dP, D), JSBI.multiply(xp[j], N_COINS))
      }
      Dprev = D
      const left = JSBI.multiply(
        JSBI.add(JSBI.divide(JSBI.multiply(na, S), this.A_PRECISION), JSBI.multiply(dP, N_COINS)),
        D
      )
      const right = JSBI.add(
        JSBI.divide(JSBI.multiply(JSBI.subtract(na, this.A_PRECISION), D), this.A_PRECISION),
        JSBI.multiply(JSBI.add(N_COINS, ONE), dP)
      )
      D = JSBI.divide(left, right)

      if (JSBI.greaterThan(D, Dprev)) {
        if (JSBI.lessThanOrEqual(JSBI.subtract(D, Dprev), ONE)) {
          break
        }
      } else {
        if (JSBI.lessThanOrEqual(JSBI.subtract(Dprev, D), ONE)) {
          break
        }
      }
    }
    this.D = D
    return D
  }

  getY(indexFrom: number, indexTo: number, x: JSBI, xp: JSBI[]): JSBI {
    const N_COINS = JSBI.BigInt(this.N_COINS)
    const a = JSBI.multiply(this.amp, this.A_PRECISION)
    const d = this.getD(xp, a)
    let c = d
    let s = ZERO
    const na = JSBI.multiply(a, N_COINS)

    let _x = ZERO
    for (let i = 0; i < this.N_COINS; i += 1) {
      if (i === indexFrom) {
        _x = x
      } else if (i !== indexTo) {
        _x = xp[i]
      } else {
        continue
      }
      s = JSBI.add(s, _x)
      c = JSBI.divide(JSBI.multiply(c, d), JSBI.multiply(_x, N_COINS))
    }
    c = JSBI.divide(JSBI.multiply(this.A_PRECISION, JSBI.multiply(c, d)), JSBI.multiply(na, N_COINS))
    const b = JSBI.add(s, JSBI.divide(JSBI.multiply(d, this.A_PRECISION), na))
    let y_prev = ZERO
    let y = d

    for (let _i = 0; _i < 255; _i += 1) {
      y_prev = y
      y = JSBI.divide(JSBI.add(JSBI.multiply(y, y), c), JSBI.subtract(JSBI.add(JSBI.multiply(TWO, y), b), d))

      if (JSBI.greaterThan(y, y_prev)) {
        if (JSBI.lessThanOrEqual(JSBI.subtract(y, y_prev), ONE)) {
          return y
        }
      } else {
        if (JSBI.lessThanOrEqual(JSBI.subtract(y_prev, y), ONE)) {
          return y
        }
      }
    }
    return y
  }

  calculateSwap(indexFrom: number, indexTo: number, dx: JSBI, xp: JSBI[]): [JSBI, JSBI] {
    const x = JSBI.add(xp[indexFrom], JSBI.multiply(this.tokenPrecisionMultipliers[indexFrom], dx))
    const y = this.getY(indexFrom, indexTo, x, xp)
    let dy = JSBI.subtract(JSBI.subtract(xp[indexTo], y), ONE)
    const dyFee = JSBI.divide(JSBI.multiply(dy, this.swapFee), this.FEE_DENOMINATOR)
    dy = JSBI.divide(JSBI.subtract(dy, dyFee), this.tokenPrecisionMultipliers[indexTo])
    return [dy, dyFee]
  }

  calculateRemoveLiquidity(amount: JSBI, lpTotalSupply: JSBI) {
    const feeAdjustedAmount = JSBI.divide(
      JSBI.multiply(JSBI.subtract(this.FEE_DENOMINATOR, this.currentWithdrawFee), amount),
      this.FEE_DENOMINATOR
    )
    const amounts = this.balances.map((bal) => JSBI.divide(JSBI.multiply(bal, feeAdjustedAmount), lpTotalSupply))
    return amounts
  }

  get_dx(i: number, j: number, dy: JSBI, xp: JSBI[]): JSBI {
    const y: JSBI = JSBI.subtract(
      xp[j],
      JSBI.divide(
        JSBI.multiply(
          JSBI.divide(
            JSBI.multiply(dy, this.FEE_DENOMINATOR),
            JSBI.subtract(this.FEE_DENOMINATOR, JSBI.BigInt(this.FEE_INDEX.toString()))
          ),
          this.RATES[j]
        ),
        this.PRECISION
      )
    )
    const x: JSBI = this.getY(j, i, y, xp)
    const dx: JSBI = JSBI.divide(JSBI.multiply(JSBI.subtract(x, xp[i]), this.PRECISION), this.RATES[i])
    return dx
  }
}
