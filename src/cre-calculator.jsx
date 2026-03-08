import { useState, useMemo, useCallback, memo } from "react";

import React from 'react';

const C = {
  bg: "#0a0e17", card: "#111827", border: "#1e293b",
  accent: "#c9a55a", accentDim: "#a8873d", accentGlow: "rgba(201,165,90,0.15)",
  text: "#f1f5f9", textDim: "#94a3b8", textMuted: "#64748b",
  green: "#22c55e", red: "#ef4444", blue: "#3b82f6",
  errBg: "rgba(239,68,68,0.06)", errBorder: "rgba(239,68,68,0.5)",
};

const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
};
const fmtDec = (n, d = 2) => {
  if (n === undefined || n === null || isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
};
const pct = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "0.00%";
  return (n * 100).toFixed(2) + "%";
};
const isEmpty = (v) => v === "" || v === undefined || v === null;
function calcPMT(rate, nper, pv) {
  if (rate === 0) return -pv / nper;
  return -(pv * rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
}

const STEPS = [
  { id: 1, label: "Property", icon: "🏢" }, { id: 2, label: "Income", icon: "💰" },
  { id: 3, label: "Expenses", icon: "📊" }, { id: 4, label: "Valuation", icon: "🎯" },
  { id: 5, label: "Construction", icon: "🏗️" }, { id: 6, label: "Financing", icon: "🏦" },
  { id: 7, label: "Cash Flow", icon: "📈" }, { id: 8, label: "Summary", icon: "✅" },
];
const ANALYSIS_TYPES = ["Buying", "Selling", "Existing Property (Hold)", "Build"];
const PROPERTY_TYPES = ["Office", "Retail", "Multi-Family", "Mixed-Use", "Industrial"];

// ─── EXTRACTED COMPONENTS (stable, won't cause remount) ─────────────────────

function ValidatedInput({ label, value, onChange, prefix, suffix, type, field, required: req, hasError, errorMsg, onBlur }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: hasError ? C.red : C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", transition: "color 0.2s" }}>
          {label}{req && <span style={{ color: C.red, fontSize: 13, lineHeight: 1 }}>*</span>}
        </label>
      )}
      <div style={{
        display: "flex", alignItems: "center",
        background: hasError ? C.errBg : "#0d1220",
        border: `1.5px solid ${hasError ? C.errBorder : C.border}`,
        borderRadius: 8, overflow: "hidden", transition: "all 0.25s",
        boxShadow: hasError ? "0 0 0 3px rgba(239,68,68,0.08)" : "none",
      }}>
        {prefix && <span style={{ padding: "0 0 0 12px", color: hasError ? C.red : C.textMuted, fontSize: 14, fontFamily: "'DM Mono', monospace" }}>{prefix}</span>}
        <input
          type={type || "text"} value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          style={{ flex: 1, background: "transparent", border: "none", color: hasError ? "#fca5a5" : C.text, padding: "12px", fontSize: 14, fontFamily: "'DM Mono', monospace", outline: "none", width: "100%" }}
        />
        {suffix && <span style={{ padding: "0 12px 0 0", color: hasError ? "rgba(239,68,68,0.6)" : C.textMuted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{suffix}</span>}
      </div>
      <div style={{ minHeight: 18, marginTop: 4 }}>
        {hasError && errorMsg && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.red, fontFamily: "'DM Sans', sans-serif", animation: "slideDown 0.2s ease" }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function UnitCellInput({ value, onChange, onBlur, hasError, errorMsg, type, align, mono }) {
  return (
    <div>
      <input type={type || "text"} value={value} onChange={onChange} onBlur={onBlur}
        style={{
          background: hasError ? C.errBg : "#0d1220",
          border: `1.5px solid ${hasError ? C.errBorder : C.border}`,
          borderRadius: 6, color: hasError ? "#fca5a5" : C.text, padding: "10px 12px", fontSize: 13,
          fontFamily: mono ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
          outline: "none", textAlign: align || "left", width: "100%", boxSizing: "border-box",
          transition: "all 0.25s", boxShadow: hasError ? "0 0 0 2px rgba(239,68,68,0.08)" : "none",
        }}
      />
      {hasError && errorMsg && (
        <div style={{ fontSize: 9, color: C.red, marginTop: 3, fontFamily: "'DM Sans', sans-serif", animation: "slideDown 0.15s ease" }}>{errorMsg}</div>
      )}
    </div>
  );
}

function Selector({ options, value, onChange, label }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>{label}</label>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} style={{
            padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif", cursor: "pointer", transition: "all 0.2s",
            background: value === o ? C.accent : "transparent",
            color: value === o ? "#0a0e17" : C.textDim,
            border: `1px solid ${value === o ? C.accent : C.border}`,
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value: val, sub, highlight, small: sm }) {
  return (
    <div style={{
      background: highlight ? C.accentGlow : "rgba(255,255,255,0.02)",
      border: `1px solid ${highlight ? C.accent : C.border}`,
      borderRadius: 12, padding: sm ? "14px 16px" : "20px 24px", transition: "all 0.3s",
    }}>
      <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: sm ? 20 : 28, fontWeight: 700, color: highlight ? C.accent : C.text, fontFamily: "'DM Mono', monospace", letterSpacing: "-0.02em" }}>{val}</div>
      {sub && <div style={{ fontSize: 12, color: C.textDim, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 26, fontWeight: 700, color: C.text, fontFamily: "'Playfair Display', serif", margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: 14, color: C.textDim, margin: "6px 0 0", fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p>}
      <div style={{ width: 48, height: 3, background: `linear-gradient(90deg, ${C.accent}, transparent)`, marginTop: 12, borderRadius: 2 }} />
    </div>
  );
}

function ErrorBanner({ count }) {
  if (!count) return null;
  return (
    <div style={{ background: C.errBg, border: `1px solid ${C.errBorder}`, borderRadius: 10, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10, animation: "slideDown 0.3s ease" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke={C.red} strokeWidth="1.5"/><path d="M8 4.5v4" stroke={C.red} strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.75" fill={C.red}/></svg>
      </div>
      <div style={{ fontSize: 13, color: C.red, fontFamily: "'DM Sans', sans-serif" }}>
        <strong>{count} {count === 1 ? "field requires" : "fields require"} attention</strong> — fill in all required fields to continue.
      </div>
    </div>
  );
}

// ─── MAIN APP ───────────────────────────────────────────────────────────────
export default function CRECalculator() {
  const [step, setStep] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [touched, setTouched] = useState({});
  const [triedNext, setTriedNext] = useState({});
  const [shakeNext, setShakeNext] = useState(false);

  const touch = useCallback((field) => setTouched((p) => ({ ...p, [field]: true })), []);
  const touchAll = useCallback((fields) => {
    const t = {};
    fields.forEach((f) => (t[f] = true));
    setTouched((p) => ({ ...p, ...t }));
  }, []);

  // Step 1
  const [analysisType, setAnalysisType] = useState("Buying");
  const [propertyType, setPropertyType] = useState("Multi-Family");
  const [propertyName, setPropertyName] = useState("");
  const [completionYear, setCompletionYear] = useState("");
  const [siteArea, setSiteArea] = useState("");
  const [gba, setGba] = useState("");

  // Step 2
  const [units, setUnits] = useState([
    { type: "Studio", count: 33, avgSF: 510, rent: 1550 },
    { type: "1 BR / 1 BA", count: 22, avgSF: 650, rent: 1800 },
    { type: "2 BR / 2 BA", count: 15, avgSF: 825, rent: 2200 },
  ]);
  const [vacancyRate, setVacancyRate] = useState(5);
  const [nnnPerSF, setNnnPerSF] = useState(0);
  const [petFee, setPetFee] = useState(500);
  const [parkingStalls, setParkingStalls] = useState(25);
  const [parkingRate, setParkingRate] = useState(75);

  // Step 3
  const [realEstateTaxRate, setRealEstateTaxRate] = useState(7);
  const [insurance, setInsurance] = useState(25000);
  const [electricity, setElectricity] = useState(7000);
  const [waterSewer, setWaterSewer] = useState(3500);
  const [garbage, setGarbage] = useState(21000);
  const [maintenance, setMaintenance] = useState(24500);
  const [unitTurnover, setUnitTurnover] = useState(21000);
  const [fireSecurity, setFireSecurity] = useState(7000);
  const [grounds, setGrounds] = useState(17500);
  const [managementPct, setManagementPct] = useState(4);
  const [adminSalary, setAdminSalary] = useState(37000);
  const [replacementReserves, setReplacementReserves] = useState(2);

  // Step 4
  const [capRates] = useState([5.5, 6.0, 6.5, 7.0, 7.5]);
  const [concludedCapRate, setConcludedCapRate] = useState(6.5);

  // Step 5
  const [landCostPerSF, setLandCostPerSF] = useState(24);
  const [demolition, setDemolition] = useState(40000);
  const [hardCostPerSF, setHardCostPerSF] = useState(200);
  const [salesTaxRate, setSalesTaxRate] = useState(9);
  const [parkingGarageSF, setParkingGarageSF] = useState(8501);
  const [parkingCostPerSF, setParkingCostPerSF] = useState(125);
  const [architectural, setArchitectural] = useState(70000);
  const [civilSurvey, setCivilSurvey] = useState(100000);
  const [mechanical, setMechanical] = useState(50000);
  const [trafficImpactPerUnit, setTrafficImpactPerUnit] = useState(3000);
  const [parkImpactPerUnit, setParkImpactPerUnit] = useState(3500);
  const [otherFeesPerUnit, setOtherFeesPerUnit] = useState(2000);
  const [constructionLoanRate, setConstructionLoanRate] = useState(6);
  const [contingencyPct, setContingencyPct] = useState(5);

  // Step 6
  const [downPaymentPct, setDownPaymentPct] = useState(30);
  const [interestRate, setInterestRate] = useState(6);
  const [amortYears, setAmortYears] = useState(25);

  // Step 7
  const [incomeGrowth, setIncomeGrowth] = useState(3);
  const [expenseGrowth, setExpenseGrowth] = useState(3);
  const [exitCapRate, setExitCapRate] = useState(6.5);

  // ─── VALIDATION ───────────────────────────────────────────────────────────
  const stepValidation = useMemo(() => ({
    1: {
      propertyName: { val: propertyName, test: (v) => !isEmpty(v), msg: "Property name is required" },
      completionYear: { val: completionYear, test: (v) => !isEmpty(v) && Number(v) > 1800 && Number(v) < 2100, msg: "Enter a valid year (1800–2099)" },
      siteArea: { val: siteArea, test: (v) => !isEmpty(v) && Number(v) > 0, msg: "Site area is required" },
      gba: { val: gba, test: (v) => !isEmpty(v) && Number(v) > 0, msg: "Gross building area is required" },
    },
    2: { vacancyRate: { val: vacancyRate, test: (v) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0, msg: "Enter a vacancy rate" } },
    3: {
      realEstateTaxRate: { val: realEstateTaxRate, test: (v) => v !== "" && Number(v) >= 0, msg: "Tax rate is required" },
      insurance: { val: insurance, test: (v) => v !== "" && Number(v) >= 0, msg: "Insurance amount is required" },
    },
    4: { concludedCapRate: { val: concludedCapRate, test: (v) => v !== "" && Number(v) > 0, msg: "Enter a concluded cap rate" } },
    5: {
      landCostPerSF: { val: landCostPerSF, test: (v) => v !== "" && Number(v) > 0, msg: "Land cost is required" },
      hardCostPerSF: { val: hardCostPerSF, test: (v) => v !== "" && Number(v) > 0, msg: "Hard cost is required" },
    },
    6: {
      downPaymentPct: { val: downPaymentPct, test: (v) => v !== "" && Number(v) > 0 && Number(v) <= 100, msg: "Enter valid down payment (1–100%)" },
      interestRate: { val: interestRate, test: (v) => v !== "" && Number(v) > 0, msg: "Interest rate is required" },
      amortYears: { val: amortYears, test: (v) => v !== "" && Number(v) > 0, msg: "Amortization period is required" },
    },
    7: {
      incomeGrowth: { val: incomeGrowth, test: (v) => v !== "" && !isNaN(Number(v)), msg: "Income growth rate is required" },
      expenseGrowth: { val: expenseGrowth, test: (v) => v !== "" && !isNaN(Number(v)), msg: "Expense growth rate is required" },
      exitCapRate: { val: exitCapRate, test: (v) => v !== "" && Number(v) > 0, msg: "Exit cap rate is required" },
    },
    8: {},
  }), [propertyName, completionYear, siteArea, gba, vacancyRate, realEstateTaxRate, insurance, concludedCapRate, landCostPerSF, hardCostPerSF, downPaymentPct, interestRate, amortYears, incomeGrowth, expenseGrowth, exitCapRate]);

  const unitErrors = useMemo(() => units.map((u) => ({
    type: isEmpty(u.type) ? "Type required" : null,
    count: (u.count === "" || Number(u.count) <= 0) ? "Enter count" : null,
    avgSF: (u.avgSF === "" || Number(u.avgSF) <= 0) ? "Enter SF" : null,
    rent: (u.rent === "" || Number(u.rent) <= 0) ? "Enter rent" : null,
  })), [units]);

  const getStepErrors = useCallback((sid) => {
    const rules = stepValidation[sid] || {};
    const errors = {};
    for (const [f, r] of Object.entries(rules)) { if (!r.test(r.val)) errors[f] = r.msg; }
    if (sid === 2) {
      if (unitErrors.some((ue) => ue.type || ue.count || ue.avgSF || ue.rent)) errors._units = "Fix unit errors";
      if (units.length === 0) errors._units = "Add at least one unit";
    }
    return errors;
  }, [stepValidation, unitErrors, units]);

  const isStepValid = useCallback((sid) => Object.keys(getStepErrors(sid)).length === 0, [getStepErrors]);

  const canGoTo = useCallback((tid) => {
    const vis = STEPS.filter((s) => !(s.id === 5 && analysisType !== "Build"));
    for (const s of vis) { if (s.id === tid) return true; if (!isStepValid(s.id)) return false; }
    return true;
  }, [isStepValid, analysisType]);

  // Helper: get error info for a field on current step
  const fieldError = useCallback((field) => {
    const rules = stepValidation[step] || {};
    const rule = rules[field];
    if (!rule) return { hasError: false, errorMsg: null };
    const hasError = touched[field] && !rule.test(rule.val);
    return { hasError, errorMsg: hasError ? rule.msg : null };
  }, [stepValidation, step, touched]);

  // ─── CALCULATIONS ─────────────────────────────────────────────────────────
  const totalUnits = units.reduce((s, u) => s + (parseFloat(u.count) || 0), 0);
  const totalSF = units.reduce((s, u) => s + (parseFloat(u.count) || 0) * (parseFloat(u.avgSF) || 0), 0);
  const grossRentalIncome = units.reduce((s, u) => s + (parseFloat(u.count) || 0) * (parseFloat(u.rent) || 0) * 12, 0);
  const nnnReimbursements = (parseFloat(nnnPerSF) || 0) * (parseFloat(gba) || totalSF);
  const pgi = grossRentalIncome + nnnReimbursements;
  const vacancyLoss = pgi * ((parseFloat(vacancyRate) || 0) / 100);
  const egi_base = pgi - vacancyLoss;
  const supplementalIncome = ((parseFloat(petFee) || 0) * 12) + ((parseFloat(parkingStalls) || 0) * (parseFloat(parkingRate) || 0) * 12);
  const totalEGI = egi_base + supplementalIncome;
  const propTaxes = totalEGI * ((parseFloat(realEstateTaxRate) || 0) / 100);
  const totalFixedExpenses = propTaxes + (parseFloat(insurance) || 0);
  const totalUtilities = (parseFloat(electricity) || 0) + (parseFloat(waterSewer) || 0) + (parseFloat(garbage) || 0);
  const totalMaintExp = (parseFloat(maintenance) || 0) + (parseFloat(unitTurnover) || 0) + (parseFloat(fireSecurity) || 0) + (parseFloat(grounds) || 0);
  const mgmtFee = totalEGI * ((parseFloat(managementPct) || 0) / 100);
  const reservesAmt = totalEGI * ((parseFloat(replacementReserves) || 0) / 100);
  const totalExpenses = totalFixedExpenses + totalUtilities + totalMaintExp + mgmtFee + (parseFloat(adminSalary) || 0) + reservesAmt;
  const noi = totalEGI - totalExpenses;
  const valuations = capRates.map((cr) => ({ capRate: cr, value: cr > 0 ? noi / (cr / 100) : 0, perSF: cr > 0 && totalSF > 0 ? noi / (cr / 100) / totalSF : 0, perUnit: cr > 0 && totalUnits > 0 ? noi / (cr / 100) / totalUnits : 0 }));
  const concludedValue = concludedCapRate > 0 ? noi / (concludedCapRate / 100) : 0;
  const siteAreaNum = parseFloat(siteArea) || totalSF;
  const gbaNum = parseFloat(gba) || totalSF;
  const landCost = (parseFloat(landCostPerSF) || 0) * siteAreaNum;
  const hardCosts = (parseFloat(hardCostPerSF) || 0) * gbaNum;
  const hardCostsTax = hardCosts * ((parseFloat(salesTaxRate) || 0) / 100);
  const parkingCost = (parseFloat(parkingGarageSF) || 0) * (parseFloat(parkingCostPerSF) || 0);
  const softCosts = (parseFloat(architectural) || 0) + (parseFloat(civilSurvey) || 0) + (parseFloat(mechanical) || 0);
  const impactFees = ((parseFloat(trafficImpactPerUnit) || 0) + (parseFloat(parkImpactPerUnit) || 0) + (parseFloat(otherFeesPerUnit) || 0)) * totalUnits;
  const sub1 = landCost + (parseFloat(demolition) || 0) + hardCosts + hardCostsTax + parkingCost + softCosts + impactFees;
  const cLI = sub1 * ((parseFloat(constructionLoanRate) || 0) / 100) * 0.4;
  const contingency = (sub1 - landCost) * ((parseFloat(contingencyPct) || 0) / 100);
  const totalDevBudget = sub1 + cLI + sub1 * 0.01 + sub1 * 0.005 + contingency + 15000;
  const constructionCap = noi > 0 ? noi / totalDevBudget : 0;
  const purchasePrice = analysisType === "Build" ? totalDevBudget : concludedValue;
  const downPayment = purchasePrice * ((parseFloat(downPaymentPct) || 0) / 100);
  const loanAmount = purchasePrice - downPayment;
  const monthlyRate = (parseFloat(interestRate) || 0) / 100 / 12;
  const totalMonths = (parseFloat(amortYears) || 0) * 12;
  const monthlyPayment = monthlyRate > 0 && totalMonths > 0 ? -calcPMT(monthlyRate, totalMonths, loanAmount) : 0;
  const annualDebtService = monthlyPayment * 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const annualCashFlow = noi - annualDebtService;
  const cashOnCash = downPayment > 0 ? annualCashFlow / downPayment : 0;

  const cashFlowYears = useMemo(() => {
    const yrs = []; let cumP = 0; let bal = loanAmount;
    const ig = (parseFloat(incomeGrowth) || 0) / 100;
    const eg = (parseFloat(expenseGrowth) || 0) / 100;
    for (let y = 1; y <= 10; y++) {
      const yEGI = totalEGI * Math.pow(1 + ig, y - 1);
      const yExp = totalExpenses * Math.pow(1 + eg, y - 1);
      const yNOI = yEGI - yExp; const yCF = yNOI - annualDebtService;
      let yP = 0;
      for (let m = 0; m < 12; m++) { const ip = bal * monthlyRate; const pp = monthlyPayment - ip; yP += pp; bal -= pp; }
      cumP += yP;
      yrs.push({ year: y, egi: yEGI, expenses: yExp, noi: yNOI, cashFlow: yCF, principal: yP, cumPrincipal: cumP, coC: downPayment > 0 ? yCF / downPayment : 0, totalReturn: downPayment > 0 ? (yCF + yP) / downPayment : 0, balance: bal });
    }
    return yrs;
  }, [totalEGI, totalExpenses, annualDebtService, monthlyRate, monthlyPayment, loanAmount, downPayment, incomeGrowth, expenseGrowth]);

  const exitValue = cashFlowYears.length > 0 ? (cashFlowYears[9]?.noi * (1 + (parseFloat(incomeGrowth) || 0) / 100)) / ((parseFloat(exitCapRate) || 6.5) / 100) : 0;
  const irrFlows = useMemo(() => {
    const fl = [-downPayment];
    for (let y = 0; y < 10; y++) {
      if (y === 9) fl.push((cashFlowYears[y]?.cashFlow || 0) + exitValue - (cashFlowYears[y]?.balance || 0));
      else fl.push(cashFlowYears[y]?.cashFlow || 0);
    }
    return fl;
  }, [downPayment, cashFlowYears, exitValue]);

  function calcIRR(flows, guess = 0.1) {
    let rate = guess;
    for (let i = 0; i < 1000; i++) {
      let npv = 0, dnpv = 0;
      for (let j = 0; j < flows.length; j++) { npv += flows[j] / Math.pow(1 + rate, j); dnpv -= j * flows[j] / Math.pow(1 + rate, j + 1); }
      if (Math.abs(dnpv) < 1e-10) break;
      const nr = rate - npv / dnpv;
      if (Math.abs(nr - rate) < 1e-8) return nr;
      rate = nr;
    }
    return rate;
  }
  const irr = irrFlows[0] < 0 ? calcIRR(irrFlows) : 0;

  // ─── NAV ──────────────────────────────────────────────────────────────────
  const visibleSteps = STEPS.filter((s) => !(s.id === 5 && analysisType !== "Build"));
  const goTo = (s) => { setAnimate(false); setTimeout(() => { setStep(s); setAnimate(true); }, 150); };

  const handleNext = () => {
    const idx = visibleSteps.findIndex((s) => s.id === step);
    if (idx >= visibleSteps.length - 1) return;
    const errors = getStepErrors(step);
    if (Object.keys(errors).length > 0) {
      touchAll(Object.keys(stepValidation[step] || {}));
      if (step === 2) { const ut = {}; units.forEach((_, i) => { ["type","count","avgSF","rent"].forEach(f => ut[`unit_${i}_${f}`] = true); }); setTouched(p => ({...p, ...ut})); }
      setTriedNext((p) => ({ ...p, [step]: true }));
      setShakeNext(true); setTimeout(() => setShakeNext(false), 600);
      return;
    }
    goTo(visibleSteps[idx + 1].id);
  };
  const handlePrev = () => { const idx = visibleSteps.findIndex((s) => s.id === step); if (idx > 0) goTo(visibleSteps[idx - 1].id); };

  const bannerCount = triedNext[step] ? Object.keys(getStepErrors(step)).length : 0;

  // ─── STEP CONTENT ─────────────────────────────────────────────────────────
  const renderStep = () => {
    const f = { opacity: animate ? 1 : 0, transform: animate ? "translateY(0)" : "translateY(12px)", transition: "all 0.3s ease" };
    // shorthand for building input props
    const ip = (label, value, onChange, field, opts = {}) => {
      const { hasError, errorMsg } = fieldError(field);
      return { label, value, onChange, field, hasError, errorMsg, onBlur: () => touch(field), ...opts };
    };

    switch (step) {
      case 1: return (<div style={f}><SectionHeader title="Property Details" subtitle="Define your property and analysis type" /><ErrorBanner count={bannerCount} />
        <Selector label="Analysis Type" options={ANALYSIS_TYPES} value={analysisType} onChange={setAnalysisType} />
        <Selector label="Property Type" options={PROPERTY_TYPES} value={propertyType} onChange={setPropertyType} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ gridColumn: "1/-1" }}><ValidatedInput {...ip("Property Name or Address", propertyName, setPropertyName, "propertyName", { required: true })} /></div>
          <ValidatedInput {...ip("Completion Year", completionYear, setCompletionYear, "completionYear", { type: "number", required: true })} />
          <ValidatedInput {...ip("Site Area", siteArea, setSiteArea, "siteArea", { suffix: "SF", type: "number", required: true })} />
          <ValidatedInput {...ip("Gross Building Area", gba, setGba, "gba", { suffix: "SF", type: "number", required: true })} />
        </div></div>);

      case 2: return (<div style={f}><SectionHeader title="Property Income" subtitle="Enter unit mix and supplemental income" /><ErrorBanner count={bannerCount} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", gap: 8, marginBottom: 8 }}>
            {["Unit Type", "Units", "Avg SF", "Rent/Mo", ""].map((h) => (<div key={h} style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", padding: "0 4px" }}>{h}</div>))}
          </div>
          {units.map((u, i) => { const ue = unitErrors[i]; return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 40px", gap: 8, marginBottom: 8, alignItems: "start" }}>
              <UnitCellInput value={u.type} onChange={(e) => { const n = [...units]; n[i].type = e.target.value; setUnits(n); }} onBlur={() => touch(`unit_${i}_type`)} hasError={touched[`unit_${i}_type`] && !!ue?.type} errorMsg={ue?.type} />
              <UnitCellInput type="number" value={u.count} onChange={(e) => { const n = [...units]; n[i].count = e.target.value; setUnits(n); }} onBlur={() => touch(`unit_${i}_count`)} hasError={touched[`unit_${i}_count`] && !!ue?.count} errorMsg={ue?.count} align="right" mono />
              <UnitCellInput type="number" value={u.avgSF} onChange={(e) => { const n = [...units]; n[i].avgSF = e.target.value; setUnits(n); }} onBlur={() => touch(`unit_${i}_avgSF`)} hasError={touched[`unit_${i}_avgSF`] && !!ue?.avgSF} errorMsg={ue?.avgSF} align="right" mono />
              <UnitCellInput type="number" value={u.rent} onChange={(e) => { const n = [...units]; n[i].rent = e.target.value; setUnits(n); }} onBlur={() => touch(`unit_${i}_rent`)} hasError={touched[`unit_${i}_rent`] && !!ue?.rent} errorMsg={ue?.rent} align="right" mono />
              <button onClick={() => setUnits(units.filter((_, j) => j !== i))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 18, padding: "10px 4px" }}>×</button>
            </div>); })}
          <button onClick={() => setUnits([...units, { type: "", count: "", avgSF: "", rent: "" }])} style={{ background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 8, color: C.textMuted, padding: "10px 20px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", width: "100%", marginTop: 8 }}>+ Add Unit Type</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ValidatedInput {...ip("Vacancy Rate", vacancyRate, setVacancyRate, "vacancyRate", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput label="NNN Reimbursements / SF" value={nnnPerSF} onChange={setNnnPerSF} prefix="$" type="number" field="nnnPerSF" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Pet Fee (Monthly)" value={petFee} onChange={setPetFee} prefix="$" type="number" field="petFee" onBlur={() => {}} hasError={false} errorMsg={null} />
          <div>
            <ValidatedInput label="Parking Stalls" value={parkingStalls} onChange={setParkingStalls} type="number" field="parkingStalls" onBlur={() => {}} hasError={false} errorMsg={null} />
            <ValidatedInput label="Rate per Stall / Mo" value={parkingRate} onChange={setParkingRate} prefix="$" type="number" field="parkingRate" onBlur={() => {}} hasError={false} errorMsg={null} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          <Metric label="Total Units" value={totalUnits} small /><Metric label="Gross Rental Income" value={fmt(grossRentalIncome)} small /><Metric label="Effective Gross Income" value={fmt(totalEGI)} small highlight />
        </div></div>);

      case 3: return (<div style={f}><SectionHeader title="Operating Expenses" subtitle="Fixed, variable, and management costs" /><ErrorBanner count={bannerCount} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ValidatedInput {...ip("Real Estate Tax (% of EGI)", realEstateTaxRate, setRealEstateTaxRate, "realEstateTaxRate", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput {...ip("Insurance", insurance, setInsurance, "insurance", { prefix: "$", type: "number", required: true })} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 12px", fontFamily: "'DM Sans', sans-serif" }}>Utilities</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[["Electricity", electricity, setElectricity], ["Water & Sewer", waterSewer, setWaterSewer], ["Garbage", garbage, setGarbage]].map(([l, v, fn]) => (
            <ValidatedInput key={l} label={l} value={v} onChange={fn} prefix="$" type="number" field={l} onBlur={() => {}} hasError={false} errorMsg={null} />
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 12px", fontFamily: "'DM Sans', sans-serif" }}>Maintenance & Repair</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[["Supplies & Maintenance", maintenance, setMaintenance], ["Unit Turnover", unitTurnover, setUnitTurnover], ["Fire/Security", fireSecurity, setFireSecurity], ["Grounds", grounds, setGrounds]].map(([l, v, fn]) => (
            <ValidatedInput key={l} label={l} value={v} onChange={fn} prefix="$" type="number" field={l} onBlur={() => {}} hasError={false} errorMsg={null} />
          ))}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 12px", fontFamily: "'DM Sans', sans-serif" }}>Management</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <ValidatedInput label="Management Fee (% EGI)" value={managementPct} onChange={setManagementPct} suffix="%" type="number" field="mgmt" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Admin Salaries" value={adminSalary} onChange={setAdminSalary} prefix="$" type="number" field="admin" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Reserves (% EGI)" value={replacementReserves} onChange={setReplacementReserves} suffix="%" type="number" field="res" onBlur={() => {}} hasError={false} errorMsg={null} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          <Metric label="Total Expenses" value={fmt(totalExpenses)} small /><Metric label="Expense Ratio" value={pct(totalEGI > 0 ? totalExpenses / totalEGI : 0)} small /><Metric label="Net Operating Income" value={fmt(noi)} highlight small />
        </div></div>);

      case 4: return (<div style={f}><SectionHeader title="Cap Rate & Valuation" subtitle="Property value based on income approach" /><ErrorBanner count={bannerCount} />
        <div style={{ overflowX: "auto", marginBottom: 24 }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: "'DM Sans', sans-serif" }}>
            <thead><tr>{["Cap Rate", "Value", "Value/SF", "Value/Unit"].map((h) => (<th key={h} style={{ padding: "12px 16px", fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{h}</th>))}</tr></thead>
            <tbody>{valuations.map((v, i) => (<tr key={i} style={{ background: Math.abs(v.capRate - concludedCapRate) < 0.01 ? C.accentGlow : "transparent" }}>
              <td style={{ padding: "14px 16px", fontSize: 14, fontFamily: "'DM Mono', monospace", color: C.accent, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{v.capRate.toFixed(1)}%</td>
              <td style={{ padding: "14px 16px", fontSize: 14, fontFamily: "'DM Mono', monospace", color: C.text, textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{fmt(v.value)}</td>
              <td style={{ padding: "14px 16px", fontSize: 14, fontFamily: "'DM Mono', monospace", color: C.textDim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{fmtDec(v.perSF)}</td>
              <td style={{ padding: "14px 16px", fontSize: 14, fontFamily: "'DM Mono', monospace", color: C.textDim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{fmt(v.perUnit)}</td>
            </tr>))}</tbody>
          </table>
        </div>
        <ValidatedInput {...ip("Concluded Cap Rate", concludedCapRate, setConcludedCapRate, "concludedCapRate", { suffix: "%", type: "number", required: true })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Metric label="Concluded Value" value={fmt(concludedValue)} highlight /><Metric label="NOI" value={fmt(noi)} sub={`${fmtDec(totalSF > 0 ? noi / totalSF : 0)} /SF`} />
        </div></div>);

      case 5: return (<div style={f}><SectionHeader title="Construction Costs" subtitle="Developer cost budget" /><ErrorBanner count={bannerCount} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ValidatedInput {...ip("Land Cost / SF", landCostPerSF, setLandCostPerSF, "landCostPerSF", { prefix: "$", type: "number", required: true })} />
          <ValidatedInput label="Demolition" value={demolition} onChange={setDemolition} prefix="$" type="number" field="demo" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput {...ip("Hard Costs / SF", hardCostPerSF, setHardCostPerSF, "hardCostPerSF", { prefix: "$", type: "number", required: true })} />
          <ValidatedInput label="Sales Tax Rate" value={salesTaxRate} onChange={setSalesTaxRate} suffix="%" type="number" field="stax" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Parking Garage SF" value={parkingGarageSF} onChange={setParkingGarageSF} suffix="SF" type="number" field="pgsf" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Parking Cost / SF" value={parkingCostPerSF} onChange={setParkingCostPerSF} prefix="$" type="number" field="pcsf" onBlur={() => {}} hasError={false} errorMsg={null} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 12px", fontFamily: "'DM Sans', sans-serif" }}>Soft Costs & Fees</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[["Architectural", architectural, setArchitectural], ["Civil/Survey/Geo", civilSurvey, setCivilSurvey], ["Mechanical", mechanical, setMechanical], ["Traffic Impact / Unit", trafficImpactPerUnit, setTrafficImpactPerUnit], ["Park Impact / Unit", parkImpactPerUnit, setParkImpactPerUnit], ["Other Fees / Unit", otherFeesPerUnit, setOtherFeesPerUnit]].map(([l, v, fn]) => (
            <ValidatedInput key={l} label={l} value={v} onChange={fn} prefix="$" type="number" field={l} onBlur={() => {}} hasError={false} errorMsg={null} />
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <ValidatedInput label="Construction Loan Rate" value={constructionLoanRate} onChange={setConstructionLoanRate} suffix="%" type="number" field="clr" onBlur={() => {}} hasError={false} errorMsg={null} />
          <ValidatedInput label="Contingency" value={contingencyPct} onChange={setContingencyPct} suffix="%" type="number" field="cont" onBlur={() => {}} hasError={false} errorMsg={null} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          <Metric label="Total Dev Budget" value={fmt(totalDevBudget)} highlight small /><Metric label="Cost / SF" value={fmtDec(gbaNum > 0 ? totalDevBudget / gbaNum : 0)} small /><Metric label="Construction Cap" value={pct(constructionCap)} small />
        </div></div>);

      case 6: return (<div style={f}><SectionHeader title="Loan & Debt Analysis" subtitle="Financing structure and debt service coverage" /><ErrorBanner count={bannerCount} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ValidatedInput {...ip("Down Payment", downPaymentPct, setDownPaymentPct, "downPaymentPct", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput {...ip("Interest Rate", interestRate, setInterestRate, "interestRate", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput {...ip("Amortization", amortYears, setAmortYears, "amortYears", { suffix: "years", type: "number", required: true })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginTop: 24 }}>
          <Metric label="Purchase / Total Cost" value={fmt(purchasePrice)} /><Metric label="Down Payment" value={fmt(downPayment)} sub={`${downPaymentPct}% equity`} />
          <Metric label="Loan Amount" value={fmt(loanAmount)} sub={`${100 - (parseFloat(downPaymentPct) || 0)}% LTV`} /><Metric label="Monthly Payment" value={fmt(monthlyPayment)} />
        </div>
        <div style={{ height: 1, background: C.border, margin: "24px 0" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Metric label="Annual Debt Service" value={fmt(annualDebtService)} small /><Metric label="DSCR" value={dscr.toFixed(2) + "x"} highlight small /><Metric label="Cash on Cash" value={pct(cashOnCash)} small />
        </div>
        <div style={{ background: dscr >= 1.2 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${dscr >= 1.2 ? C.green : C.red}`, borderRadius: 10, padding: "14px 20px", marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>{dscr >= 1.2 ? "✓" : "⚠"}</span>
          <div><div style={{ fontSize: 13, fontWeight: 600, color: dscr >= 1.2 ? C.green : C.red, fontFamily: "'DM Sans', sans-serif" }}>{dscr >= 1.2 ? "Debt Coverage Adequate" : "Debt Coverage Below Threshold"}</div><div style={{ fontSize: 12, color: C.textDim }}>Lenders typically require DSCR ≥ 1.20x</div></div>
        </div></div>);

      case 7: return (<div style={f}><SectionHeader title="10-Year Cash Flow" subtitle="Projected returns with growth assumptions" /><ErrorBanner count={bannerCount} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
          <ValidatedInput {...ip("Income Growth / Yr", incomeGrowth, setIncomeGrowth, "incomeGrowth", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput {...ip("Expense Growth / Yr", expenseGrowth, setExpenseGrowth, "expenseGrowth", { suffix: "%", type: "number", required: true })} />
          <ValidatedInput {...ip("Exit Cap Rate", exitCapRate, setExitCapRate, "exitCapRate", { suffix: "%", type: "number", required: true })} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontFamily: "'DM Sans', sans-serif", minWidth: 800 }}>
            <thead><tr>{["Year", "EGI", "Expenses", "NOI", "Cash Flow", "CoC Return", "Total Return"].map((h) => (<th key={h} style={{ padding: "10px 12px", fontSize: 9, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", textAlign: "right", borderBottom: `2px solid ${C.accent}`, whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
            <tbody>{cashFlowYears.map((y, i) => (<tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              <td style={{ padding: "10px 12px", fontSize: 13, fontFamily: "'DM Mono', monospace", color: C.accent, textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{y.year}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.textDim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{fmt(y.egi)}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.red, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>({fmt(y.expenses)})</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.text, textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{fmt(y.noi)}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: y.cashFlow >= 0 ? C.green : C.red, textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{fmt(y.cashFlow)}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.textDim, textAlign: "right", borderBottom: `1px solid ${C.border}` }}>{pct(y.coC)}</td>
              <td style={{ padding: "10px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", color: C.accent, textAlign: "right", borderBottom: `1px solid ${C.border}`, fontWeight: 600 }}>{pct(y.totalReturn)}</td>
            </tr>))}</tbody>
          </table>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 24 }}>
          <Metric label="10-Year IRR" value={pct(irr)} highlight /><Metric label="Exit Value (Yr 11)" value={fmt(exitValue)} /><Metric label="Equity Multiple" value={downPayment > 0 ? (irrFlows.reduce((s, fl, idx) => (idx === 0 ? s : s + fl), 0) / downPayment).toFixed(2) + "x" : "N/A"} />
        </div>
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>Annual Cash Flow Trend</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, padding: "0 4px" }}>
            {cashFlowYears.map((y, i) => { const mx = Math.max(...cashFlowYears.map((c) => Math.abs(c.cashFlow))); const h = mx > 0 ? (Math.abs(y.cashFlow) / mx) * 100 : 0; return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'DM Mono', monospace" }}>{fmt(y.cashFlow)}</div>
                <div style={{ width: "100%", height: h, borderRadius: "4px 4px 0 0", background: y.cashFlow >= 0 ? `linear-gradient(180deg, ${C.accent}, ${C.accentDim})` : C.red, transition: "height 0.5s ease", minHeight: 2 }} />
                <div style={{ fontSize: 10, color: C.textDim, fontFamily: "'DM Mono', monospace" }}>Y{y.year}</div>
              </div>); })}
          </div>
        </div></div>);

      case 8: return (<div style={f}><SectionHeader title="Analysis Summary" subtitle={propertyName || "Commercial Property Valuation"} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>Income Statement</div>
            {[["Gross Rental Income", fmt(grossRentalIncome)], ["+ NNN Reimbursements", fmt(nnnReimbursements)], ["= Potential Gross Income", fmt(pgi)], ["- Vacancy/Credit Loss", fmt(-vacancyLoss)], ["+ Supplemental Income", fmt(supplementalIncome)]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}><span style={{ color: C.textDim }}>{l}</span><span style={{ color: C.text, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 8px", fontSize: 14, fontWeight: 700 }}><span style={{ color: C.accent }}>Effective Gross Income</span><span style={{ color: C.accent, fontFamily: "'DM Mono', monospace" }}>{fmt(totalEGI)}</span></div>
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            {[["- Total Expenses", fmt(-totalExpenses)], ["  Expense Ratio", pct(totalEGI > 0 ? totalExpenses / totalEGI : 0)]].map(([l, v], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}><span style={{ color: C.textDim }}>{l}</span><span style={{ color: C.text, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{v}</span></div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", fontSize: 16, fontWeight: 700, background: C.accentGlow, borderRadius: 8, marginTop: 8 }}><span style={{ color: C.accent }}>Net Operating Income</span><span style={{ color: C.accent, fontFamily: "'DM Mono', monospace" }}>{fmt(noi)}</span></div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Metric label="Concluded Value" value={fmt(concludedValue)} sub={`@ ${concludedCapRate}% Cap Rate`} highlight />
            <Metric label="Annual Debt Service" value={fmt(annualDebtService)} sub={`${fmt(monthlyPayment)} /month`} />
            <Metric label="DSCR" value={dscr.toFixed(2) + "x"} sub={dscr >= 1.2 ? "Meets lender threshold" : "Below lender threshold"} />
            <Metric label="Annual Cash Flow" value={fmt(annualCashFlow)} sub={`Cash on Cash: ${pct(cashOnCash)}`} />
            <Metric label="10-Year IRR" value={pct(irr)} sub={`Exit @ ${exitCapRate}% cap`} highlight />
            {analysisType === "Build" && <Metric label="Total Dev Budget" value={fmt(totalDevBudget)} sub={`Construction Cap: ${pct(constructionCap)}`} />}
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, fontFamily: "'DM Sans', sans-serif" }}>Financing Structure</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[["Equity", fmt(downPayment), `${downPaymentPct}%`], ["Loan Amount", fmt(loanAmount), `${100 - (parseFloat(downPaymentPct) || 0)}% LTV`], ["Rate / Term", `${interestRate}%`, `${amortYears} years`], ["Monthly PMT", fmt(monthlyPayment), "P&I"]].map(([l, v, s], i) => (
              <div key={i}><div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700, color: C.text, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>{v}</div><div style={{ fontSize: 11, color: C.textDim, fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>{s}</div></div>
            ))}
          </div>
        </div></div>);
      default: return null;
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const currentHasErrors = Object.keys(getStepErrors(step)).length > 0;
  const isLast = step === visibleSteps[visibleSteps.length - 1]?.id;
  const isFirst = step === visibleSteps[0]?.id;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shakeX{0%,100%{transform:translateX(0)}15%,45%,75%{transform:translateX(-5px)}30%,60%,90%{transform:translateX(5px)}}
      `}</style>

      {showIntro ? (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ textAlign: "center", maxWidth: 640, animation: "fadeIn 1s ease" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 32px", fontSize: 36, boxShadow: `0 0 60px ${C.accentGlow}` }}>🏢</div>
            <h1 style={{ fontSize: 48, fontFamily: "'Playfair Display', serif", color: C.text, margin: "0 0 8px", fontWeight: 700 }}>CRE Calculator</h1>
            <div style={{ fontSize: 13, color: C.accent, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 600, marginBottom: 24 }}>Commercial Real Estate Valuation</div>
            <p style={{ fontSize: 16, color: C.textDim, lineHeight: 1.7, marginBottom: 40 }}>A comprehensive property investment analysis tool. Calculate NOI, Cap Rate, IRR, and full 10-year cash flow projections.</p>
            <button onClick={() => setShowIntro(false)} style={{ padding: "16px 48px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", border: "none", background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, color: "#0a0e17", boxShadow: `0 4px 24px ${C.accentGlow}`, letterSpacing: "0.05em" }}>BEGIN ANALYSIS</button>
            <div style={{ marginTop: 48, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", border: `2px solid ${C.border}` }}>
                <img src="https://crecalculator.com/uploads/1669704958troy-muljat-and-team-400-×-400-px.png" alt="Troy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
              </div>
              <div style={{ textAlign: "left" }}><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Troy Muljat</div><div style={{ fontSize: 12, color: C.textMuted }}>360.328.7778 · troy@muljat.com</div></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* TOP BAR */}
          <div style={{ borderBottom: `1px solid ${C.border}`, padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(10,14,23,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🏢</div>
              <div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: C.text, lineHeight: 1 }}>CRE Calculator</div><div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.15em", marginTop: 2 }}>Troy Muljat · Muljat Group</div></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <a href="tel:360.328.7778" style={{ fontSize: 12, color: C.textDim, textDecoration: "none", fontFamily: "'DM Mono', monospace" }}>360.328.7778</a>
              <a href="mailto:troy@muljat.com" style={{ fontSize: 12, color: C.accent, textDecoration: "none" }}>troy@muljat.com</a>
            </div>
          </div>

          <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto" }}>
            {/* SIDEBAR */}
            <div style={{ width: 220, minHeight: "calc(100vh - 60px)", borderRight: `1px solid ${C.border}`, padding: "24px 0", flexShrink: 0 }}>
              {visibleSteps.map((s) => {
                const active = step === s.id;
                const completed = isStepValid(s.id) && step > s.id;
                const reachable = canGoTo(s.id);
                const locked = !reachable && s.id !== step;
                const hasErrs = !isStepValid(s.id) && triedNext[s.id];
                return (
                  <button key={s.id} onClick={() => { if (reachable) goTo(s.id); }} title={locked ? "Complete previous steps first" : ""}
                    style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 24px", border: "none", cursor: locked ? "not-allowed" : "pointer", background: active ? C.accentGlow : "transparent", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent", transition: "all 0.2s", opacity: locked ? 0.35 : 1 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: locked ? 11 : 14, fontWeight: 600, transition: "all 0.2s", background: active ? C.accent : completed ? "rgba(201,165,90,0.2)" : hasErrs ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)", color: active ? "#0a0e17" : completed ? C.accent : hasErrs ? C.red : C.textMuted }}>
                      {completed ? "✓" : locked ? "🔒" : hasErrs ? "!" : s.icon}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: active ? 600 : 400, color: active ? C.text : locked ? C.textMuted : C.textDim, textAlign: "left" }}>{s.label}</div>
                  </button>
                );
              })}
              <div style={{ padding: "24px 20px", marginTop: 24, borderTop: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 9, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12, fontWeight: 600 }}>Quick Stats</div>
                {[["NOI", fmt(noi)], ["Value", fmt(concludedValue)], ["DSCR", dscr.toFixed(2) + "x"], ["CoC", pct(cashOnCash)], ["IRR", pct(irr)]].map(([l, v], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 11 }}><span style={{ color: C.textMuted }}>{l}</span><span style={{ color: C.accent, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{v}</span></div>
                ))}
              </div>
            </div>

            {/* MAIN */}
            <div style={{ flex: 1, padding: "32px 40px", maxWidth: 960 }}>
              {renderStep()}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
                <button onClick={handlePrev} disabled={isFirst} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: isFirst ? "not-allowed" : "pointer", background: "transparent", color: isFirst ? C.textMuted : C.textDim, border: `1px solid ${C.border}`, opacity: isFirst ? 0.4 : 1, transition: "all 0.2s" }}>← Previous</button>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {currentHasErrors && triedNext[step] && (
                    <div style={{ fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 6 }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 4.5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.75" fill="currentColor"/></svg>
                      Complete required fields
                    </div>
                  )}
                  {!isLast && (
                    <button onClick={handleNext} style={{ padding: "12px 28px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", background: `linear-gradient(135deg, ${C.accent}, ${C.accentDim})`, color: "#0a0e17", border: "none", boxShadow: `0 2px 12px ${C.accentGlow}`, animation: shakeNext ? "shakeX 0.5s ease" : "none" }}>Next Step →</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
