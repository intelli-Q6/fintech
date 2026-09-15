import React, { useState } from 'react';
import {
  calculateSIP,
  calculateStepUpSIP,
  calculateLumpsum,
  calculateSWP,
  calculatePPF,
  calculateEPF,
  calculateNPS,
  calculateFD,
  calculateBondYTM,
  calculateFIRE,
  calculateInflationImpact,
  calculateGratuity,
  calculateGoalSIP,
  CalculatorScheduleItem
} from '../../core/calculators/engine';
import { calculateCAGR, formatINR, formatPercent } from '../../core/math/xirr';
import { CompoundGrowthChart } from '../../components/Charts/Charts';
import { ShieldCheck, Calculator, TrendingUp, BarChart3, Table as TableIcon } from 'lucide-react';

type CalcType =
  | 'sip'
  | 'stepup_sip'
  | 'lumpsum'
  | 'ppf'
  | 'epf'
  | 'nps'
  | 'fire'
  | 'bond_ytm'
  | 'gratuity'
  | 'goal_reverse';

// Reusable Year-by-Year Growth Chart / Amortization Table Component
const ScheduleVisualizer: React.FC<{
  schedule: CalculatorScheduleItem[];
  mode: 'chart' | 'table';
  onToggleMode: (m: 'chart' | 'table') => void;
}> = ({ schedule, mode, onToggleMode }) => {
  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 12, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Wealth Growth Trajectory
        </span>
        <div className="segmented-capsule-bar" style={{ padding: 2 }}>
          <button
            onClick={() => onToggleMode('chart')}
            className={`segmented-pill-btn ${mode === 'chart' ? 'active' : ''}`}
            style={{ padding: '3px 10px', fontSize: '11px' }}
          >
            <BarChart3 size={11} />
            <span>Interactive Chart</span>
          </button>
          <button
            onClick={() => onToggleMode('table')}
            className={`segmented-pill-btn ${mode === 'table' ? 'active' : ''}`}
            style={{ padding: '3px 10px', fontSize: '11px' }}
          >
            <TableIcon size={11} />
            <span>Amortization Table ({schedule.length}Y)</span>
          </button>
        </div>
      </div>

      {mode === 'chart' ? (
        <CompoundGrowthChart schedule={schedule} height={190} />
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)' }}>
          <table className="terminal-table" style={{ minWidth: '100%', fontSize: '11px' }}>
            <thead>
              <tr>
                <th>Timeline</th>
                <th>Cumulative Invested</th>
                <th>Interest Accrued</th>
                <th>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(item => (
                <tr key={item.year}>
                  <td style={{ fontWeight: 600 }}>Year {item.year}</td>
                  <td className="tabular-nums">{formatINR(item.invested)}</td>
                  <td className="tabular-nums" style={{ color: 'var(--color-gain)' }}>+{formatINR(item.interestEarned)}</td>
                  <td className="tabular-nums" style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>{formatINR(item.closingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export const CalculatorsView: React.FC = () => {
  const [activeCalc, setActiveCalc] = useState<CalcType>('sip');
  const [growthDisplayMode, setGrowthDisplayMode] = useState<'chart' | 'table'>('chart');

  // SIP State
  const [sipMonthly, setSipMonthly] = useState(25000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(15);

  // Step-Up SIP State
  const [stepUpInitial, setStepUpInitial] = useState(20000);
  const [stepUpPercent, setStepUpPercent] = useState(10);
  const [stepUpRate, setStepUpRate] = useState(12);
  const [stepUpYears, setStepUpYears] = useState(15);

  // Lumpsum State
  const [lumpPrincipal, setLumpPrincipal] = useState(500000);
  const [lumpRate, setLumpRate] = useState(12);
  const [lumpYears, setLumpYears] = useState(10);

  // PPF State
  const [ppfDeposit, setPpfDeposit] = useState(150000);
  const [ppfYears, setPpfYears] = useState(15);

  // EPF State
  const [epfBasic, setEpfBasic] = useState(65000);
  const [epfAge, setEpfAge] = useState(28);

  // NPS State
  const [npsMonthly, setNpsMonthly] = useState(10000);
  const [npsAge, setNpsAge] = useState(30);

  // FIRE State
  const [fireExpense, setFireExpense] = useState(80000);
  const [fireCurrentAge, setFireCurrentAge] = useState(32);
  const [fireTargetAge, setFireTargetAge] = useState(48);

  // Bond YTM State
  const [bondFace, setBondFace] = useState(1000);
  const [bondPrice, setBondPrice] = useState(980);
  const [bondCoupon, setBondCoupon] = useState(7.5);
  const [bondTenure, setBondTenure] = useState(7);

  // Gratuity State
  const [gratuitySalary, setGratuitySalary] = useState(90000);
  const [gratuityTenure, setGratuityTenure] = useState(8);

  // Goal Reverse State
  const [goalTarget, setGoalTarget] = useState(25000000); // ₹2.5 Cr
  const [goalTenure, setGoalTenure] = useState(12);

  // Execute active calculations
  const sipResult = calculateSIP(sipMonthly, sipRate, sipYears);
  const stepUpResult = calculateStepUpSIP(stepUpInitial, stepUpPercent, stepUpRate, stepUpYears);
  const lumpResult = calculateLumpsum(lumpPrincipal, lumpRate, lumpYears);
  const ppfResult = calculatePPF(ppfDeposit, ppfYears);
  const epfResult = calculateEPF(epfBasic, epfAge, 58);
  const npsResult = calculateNPS(npsMonthly, npsAge, 60);
  const fireResult = calculateFIRE(fireExpense, fireCurrentAge, fireTargetAge);
  const bondResult = calculateBondYTM(bondFace, bondPrice, bondCoupon, bondTenure);
  const gratuityResult = calculateGratuity(gratuitySalary, gratuityTenure);
  const goalResult = calculateGoalSIP(goalTarget, goalTenure, 12);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1 style={{ fontSize: '20px', fontWeight: '700' }}>15+ Indian Financial Calculators</h1>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'var(--accent-surface)', color: 'var(--accent-primary)', border: '1px solid var(--accent-border)' }}>
              DYNAMIC ENGINE
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
            Mathematical Planning Tools for Wealth Accumulation, Retirement & Compounding
          </p>
        </div>
      </div>

      {/* Modern Segmented Capsule Bar */}
      <div className="segmented-capsule-bar">
        {[
          { id: 'sip', name: 'SIP' },
          { id: 'stepup_sip', name: 'Step-Up SIP' },
          { id: 'lumpsum', name: 'Lumpsum' },
          { id: 'ppf', name: 'PPF' },
          { id: 'epf', name: 'EPF (PF)' },
          { id: 'nps', name: 'NPS' },
          { id: 'fire', name: 'Retirement & FIRE' },
          { id: 'bond_ytm', name: 'Bond YTM' },
          { id: 'gratuity', name: 'Gratuity' },
          { id: 'goal_reverse', name: 'Goal Reverse SIP' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveCalc(item.id as CalcType)}
            className={`segmented-pill-btn ${activeCalc === item.id ? 'active' : ''}`}
          >
            {item.name}
          </button>
        ))}
      </div>

      {/* Dynamic Calculator Container */}
      <div className="responsive-split-calc">
        {/* Left Inputs Panel */}
        <div className="terminal-card" style={{ padding: 18 }}>
          {activeCalc === 'sip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Monthly SIP Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compounded Monthly</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Monthly Investment:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(sipMonthly)}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="200000"
                  step="1000"
                  value={sipMonthly}
                  onChange={e => setSipMonthly(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Expected Annual Return:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{sipRate}%</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="25"
                  step="0.5"
                  value={sipRate}
                  onChange={e => setSipRate(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Investment Tenure:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{sipYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={sipYears}
                  onChange={e => setSipYears(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'stepup_sip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Step-Up SIP Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Annual Salary Hike Mode</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Initial Monthly SIP:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(stepUpInitial)}</span>
                </div>
                <input
                  type="range"
                  min="2000"
                  max="150000"
                  step="1000"
                  value={stepUpInitial}
                  onChange={e => setStepUpInitial(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Annual Step-Up (%):</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>+{stepUpPercent}% yearly</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={stepUpPercent}
                  onChange={e => setStepUpPercent(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Expected Annual Return:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{stepUpRate}%</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="25"
                  step="0.5"
                  value={stepUpRate}
                  onChange={e => setStepUpRate(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Tenure (Years):</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{stepUpYears} Years</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="35"
                  step="1"
                  value={stepUpYears}
                  onChange={e => setStepUpYears(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'lumpsum' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Lumpsum Capital Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>One-Time Deposit</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>One-Time Capital Invested:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(lumpPrincipal)}</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="5000000"
                  step="25000"
                  value={lumpPrincipal}
                  onChange={e => setLumpPrincipal(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Expected Annual CAGR:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{lumpRate}%</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="30"
                  step="0.5"
                  value={lumpRate}
                  onChange={e => setLumpRate(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Horizon (Years):</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{lumpYears} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  step="1"
                  value={lumpYears}
                  onChange={e => setLumpYears(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'ppf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>PPF Parameters (7.1% p.a.)</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Section 80C Tax-Free EEE</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Annual Contribution:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(ppfDeposit)}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="150000"
                  step="5000"
                  value={ppfDeposit}
                  onChange={e => setPpfDeposit(Number(e.target.value))}
                  className="range-slider"
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Statutory cap: ₹1,50,000 per financial year
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Maturity Lock-in Period:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{ppfYears} Years</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="25"
                  step="5"
                  value={ppfYears}
                  onChange={e => setPpfYears(Number(e.target.value))}
                  className="range-slider"
                />
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  Extensible in 5-year blocks
                </span>
              </div>
            </div>
          )}

          {activeCalc === 'epf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>EPF Parameters (8.25% p.a.)</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Official EPFO Model</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Monthly Basic + DA:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(epfBasic)}</span>
                </div>
                <input
                  type="range"
                  min="15000"
                  max="300000"
                  step="5000"
                  value={epfBasic}
                  onChange={e => setEpfBasic(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Current Age:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{epfAge} Years</span>
                </div>
                <input
                  type="range"
                  min="21"
                  max="50"
                  step="1"
                  value={epfAge}
                  onChange={e => setEpfAge(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'nps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>NPS Retirement Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tier-1 Pension</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Monthly Contribution:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(npsMonthly)}</span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="100000"
                  step="1000"
                  value={npsMonthly}
                  onChange={e => setNpsMonthly(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Current Age:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{npsAge} Years (Superannuation at 60)</span>
                </div>
                <input
                  type="range"
                  min="18"
                  max="55"
                  step="1"
                  value={npsAge}
                  onChange={e => setNpsAge(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'fire' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>FIRE Runway Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Financial Independence</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Current Monthly Expense:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(fireExpense)}</span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="300000"
                  step="5000"
                  value={fireExpense}
                  onChange={e => setFireExpense(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Current Age vs Target FIRE Age:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{fireCurrentAge}Y → {fireTargetAge}Y</span>
                </div>
                <input
                  type="range"
                  min={fireCurrentAge + 2}
                  max="65"
                  step="1"
                  value={fireTargetAge}
                  onChange={e => setFireTargetAge(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'bond_ytm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Bond Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>YTM & Duration</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Market Price:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>₹{bondPrice} (Face: ₹{bondFace})</span>
                </div>
                <input
                  type="range"
                  min="800"
                  max="1200"
                  step="5"
                  value={bondPrice}
                  onChange={e => setBondPrice(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Coupon Rate:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{bondCoupon}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="14"
                  step="0.25"
                  value={bondCoupon}
                  onChange={e => setBondCoupon(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'gratuity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Gratuity Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Payment of Gratuity Act 1972</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Last Drawn Basic + DA:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(gratuitySalary)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="500000"
                  step="5000"
                  value={gratuitySalary}
                  onChange={e => setGratuitySalary(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Years of Service:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{gratuityTenure} Years</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={gratuityTenure}
                  onChange={e => setGratuityTenure(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}

          {activeCalc === 'goal_reverse' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700' }}>Reverse Goal SIP Parameters</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Solver</span>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Target Corpus Needed:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{formatINR(goalTarget)}</span>
                </div>
                <input
                  type="range"
                  min="1000000"
                  max="100000000"
                  step="1000000"
                  value={goalTarget}
                  onChange={e => setGoalTarget(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 4 }}>
                  <span>Timeline:</span>
                  <span className="tabular-nums" style={{ fontWeight: '700' }}>{goalTenure} Years</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="30"
                  step="1"
                  value={goalTenure}
                  onChange={e => setGoalTenure(Number(e.target.value))}
                  className="range-slider"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Outputs Panel — High-Density Visual Intelligence & Compound Growth */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* SIP Output */}
          {activeCalc === 'sip' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                SIP Wealth Projection
              </h3>
              <div className="calc-output-deck" style={{ marginBottom: 0 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL INVESTED</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>
                    {formatINR(sipResult.totalInvested)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ESTIMATED GAINS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>
                    +{formatINR(sipResult.totalGains)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>FUTURE VALUE</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>
                    {formatINR(sipResult.futureValue)}
                  </div>
                </div>
              </div>

              {/* Interactive SVG Compound Growth Chart / Table */}
              <ScheduleVisualizer
                schedule={sipResult.schedule}
                mode={growthDisplayMode}
                onToggleMode={setGrowthDisplayMode}
              />
            </div>
          )}

          {/* Step-Up SIP Output */}
          {activeCalc === 'stepup_sip' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Step-Up SIP Wealth Projection (+{stepUpPercent}% yearly)
              </h3>
              <div className="calc-output-deck" style={{ marginBottom: 0 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL INVESTED</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>
                    {formatINR(stepUpResult.totalInvested)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>ESTIMATED GAINS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>
                    +{formatINR(stepUpResult.totalGains)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MATURITY CORPUS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>
                    {formatINR(stepUpResult.futureValue)}
                  </div>
                </div>
              </div>

              <ScheduleVisualizer
                schedule={stepUpResult.schedule}
                mode={growthDisplayMode}
                onToggleMode={setGrowthDisplayMode}
              />
            </div>
          )}

          {/* Lumpsum Output */}
          {activeCalc === 'lumpsum' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Lumpsum Capital Compounding Projection
              </h3>
              <div className="calc-output-deck" style={{ marginBottom: 0 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>INITIAL CAPITAL</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>
                    {formatINR(lumpResult.totalInvested)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>COMPOUNDED GAINS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>
                    +{formatINR(lumpResult.totalGains)}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>MATURITY VALUE</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>
                    {formatINR(lumpResult.futureValue)}
                  </div>
                </div>
              </div>

              <ScheduleVisualizer
                schedule={lumpResult.schedule}
                mode={growthDisplayMode}
                onToggleMode={setGrowthDisplayMode}
              />
            </div>
          )}

          {/* PPF Output */}
          {activeCalc === 'ppf' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                PPF 15-Year Maturity (Tax-Free EEE)
              </h3>
              <div className="calc-output-deck" style={{ marginBottom: 0 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL DEPOSITED</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>{formatINR(ppfResult.totalInvested)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TAX-FREE INTEREST</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>+{formatINR(ppfResult.totalGains)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>TOTAL MATURITY</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>{formatINR(ppfResult.futureValue)}</div>
                </div>
              </div>

              <ScheduleVisualizer
                schedule={ppfResult.schedule}
                mode={growthDisplayMode}
                onToggleMode={setGrowthDisplayMode}
              />
            </div>
          )}

          {/* EPF Output */}
          {activeCalc === 'epf' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                EPF Retirement Corpus (Age 58)
              </h3>
              <div className="grid-metrics-3">
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL CONTRIBUTIONS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>{formatINR(epfResult.totalContributed)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>COMPOUNDED INTEREST</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>+{formatINR(epfResult.totalInterest)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ESTIMATED CORPUS</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>{formatINR(epfResult.totalCorpus)}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-xs)' }}>
                Includes Employee 12% contribution + Employer 3.67% EPF allocation compounded at statutory 8.25% p.a.
              </div>
            </div>
          )}

          {/* NPS Output */}
          {activeCalc === 'nps' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                NPS Pension Wealth at 60
              </h3>
              <div className="grid-metrics-3">
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL INVESTED</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>{formatINR(npsResult.totalInvested)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>LUMPSUM AT 60 (60%)</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>{formatINR(npsResult.lumpsumAmount)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TOTAL ACCUMULATION</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>{formatINR(npsResult.totalCorpus)}</div>
                </div>
              </div>
            </div>
          )}

          {/* FIRE Output */}
          {activeCalc === 'fire' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                FIRE Runway Target (Safe Withdrawal Rate 3.5%)
              </h3>
              <div className="grid-metrics-3" style={{ marginBottom: 12 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>MONTHLY AT RETIREMENT</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>{formatINR(fireResult.expenseAtRetire)}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Inflation Adjusted</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ANNUAL EXPENDITURE</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', marginTop: 2 }}>{formatINR(fireResult.annualExpenseAtRetire)}</div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>FIRE CORPUS TARGET</div>
                  <div className="tabular-nums" style={{ fontSize: '17px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>{formatINR(fireResult.fireCorpusTarget)}</div>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-subtle)', padding: 10, borderRadius: 'var(--radius-xs)' }}>
                Based on Trinity Study 28.5x annual multiplier (3.5% real SWR) accounting for 6% annual inflation over {fireTargetAge - fireCurrentAge} years until retirement.
              </div>
            </div>
          )}

          {/* Bond YTM Output */}
          {activeCalc === 'bond_ytm' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Bond Yield to Maturity & Duration
              </h3>
              <div className="grid-metrics-3">
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>APPROXIMATE YTM</div>
                  <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-gain)', marginTop: 2 }}>
                    {bondResult.approxYTM.toFixed(2)}%
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>MACAULAY DURATION</div>
                  <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: '700', marginTop: 2 }}>
                    {bondResult.macaulayDuration.toFixed(2)} Yrs
                  </div>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ANNUAL COUPON</div>
                  <div className="tabular-nums" style={{ fontSize: '18px', fontWeight: '700', marginTop: 2 }}>
                    ₹{bondResult.annualCoupon.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Gratuity Output */}
          {activeCalc === 'gratuity' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Statutory Gratuity Entitlement
              </h3>
              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>CALCULATED PAYABLE GRATUITY</div>
                <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>
                  {formatINR(gratuityResult.payableGratuity || 0)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                  Tax-exempt limit under Section 10(10): ₹20,00,000
                </div>
              </div>
            </div>
          )}

          {/* Goal Reverse SIP Output */}
          {activeCalc === 'goal_reverse' && (
            <div className="terminal-card" style={{ padding: 18 }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Required Monthly Investment Solver
              </h3>
              <div style={{ background: 'var(--bg-subtle)', padding: 14, borderRadius: 'var(--radius-sm)', marginBottom: 10 }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>REQUIRED MONTHLY SIP</div>
                <div className="tabular-nums" style={{ fontSize: '22px', fontWeight: '700', color: 'var(--accent-primary)', marginTop: 2 }}>
                  {formatINR(goalResult.requiredMonthlySIP)} / month
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 4 }}>
                  To achieve {formatINR(goalResult.targetAmount)} in {goalTenure} years at an assumed 12% equity CAGR.
                </div>
              </div>
            </div>
          )}

          {/* Compliance Notice */}
          <div className="compliance-notice" style={{ marginTop: 0 }}>
            <ShieldCheck size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <div>
              <strong>Client-Side Mathematical Solver:</strong> These calculators execute deterministic financial formulas in your browser. They do not transmit financial inputs or issue securities solicitations.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
