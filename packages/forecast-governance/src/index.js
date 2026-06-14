"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateGovernedForecast = generateGovernedForecast;
function generateGovernedForecast(domain, context, volatility) {
    console.log("[FORECAST_GOVERNANCE] Generating uncertainty-bounded forecast for ".concat(domain));
    var baseConfidence = Math.max(0.2, 0.9 - volatility);
    var uncertainty = volatility > 0.6 ? 'HIGH' : (volatility > 0.3 ? 'MEDIUM' : 'LOW');
    return {
        prediction: "Expected ".concat(domain, " trajectory degradation within 90 days"),
        confidence_range: "".concat((baseConfidence * 100).toFixed(1), "% - ").concat(((baseConfidence + 0.1) * 100).toFixed(1), "%"),
        evidence_sources: ['Temporal Trend T-102', 'Support SLA History'],
        historical_accuracy_score: 0.84,
        uncertainty_level: uncertainty,
        volatility_factors: ['Recent policy override', 'Operator fatigue spike']
    };
}
