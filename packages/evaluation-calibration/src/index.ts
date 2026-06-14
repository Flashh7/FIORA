export function evaluateForecastAccuracy(forecast: any, actualOutcome: any) {
  console.log(`[EVALUATION_CALIBRATION] Measuring whether organizational forecast was actually correct...`);
  
  const isCorrect = forecast.prediction.includes('CHURN_ACCELERATION') && actualOutcome.churn_occurred;
  
  if (isCorrect) {
    if (forecast.uncertainty_level === 'LOW') {
      console.log(`[EVALUATION_CALIBRATION] WARNING: Overconfident forecast detected. Volatility was underestimated.`);
      return { status: 'OVERCONFIDENT', adjustment: -0.1 };
    }
    console.log(`[EVALUATION_CALIBRATION] Forecast validated. Confidence was appropriately bounded.`);
    return { status: 'CALIBRATED', adjustment: +0.05 };
  }

  console.log(`[EVALUATION_CALIBRATION] Forecast inaccurate. Down-scoring strategic intelligence reliability.`);
  return { status: 'INACCURATE', adjustment: -0.2 };
}
