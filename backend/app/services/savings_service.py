class SavingsService:
    @staticmethod
    def calculate_savings(energy_kwh, retail_tariff, export_tariff=None, self_consumption_pct=None):
        """
        Calculates financial benefits from solar generation with complete engineering and financial rigor.
        
        Distinguishes between:
        1. Self-consumption bill reduction (offsetting expensive retail tariffs)
        2. Feed-in export credits (grid feed-in at usually lower export rates)
        3. Gross theoretical value (Total kWh * Retail Tariff)
        """
        energy_kwh = max(0.0, float(energy_kwh or 0.0))
        retail_tariff = max(0.0, float(retail_tariff or 0.0))
        
        # Simplified gross value
        gross_value = round(energy_kwh * retail_tariff, 2)
        
        # Check if dual-tariff self-consumption model is configured
        if self_consumption_pct is not None and export_tariff is not None:
            self_pct = max(0.0, min(100.0, float(self_consumption_pct))) / 100.0
            export_rate = max(0.0, float(export_tariff))
            
            self_consumed_kwh = round(energy_kwh * self_pct, 2)
            exported_kwh = round(energy_kwh - self_consumed_kwh, 2)
            
            self_consumption_savings = round(self_consumed_kwh * retail_tariff, 2)
            export_credit = round(exported_kwh * export_rate, 2)
            total_net_benefit = round(self_consumption_savings + export_credit, 2)
            
            return {
                'model_type': 'NET_BENEFIT_DUAL_TARIFF',
                'energy_generated_kwh': round(energy_kwh, 2),
                'retail_tariff': retail_tariff,
                'export_tariff': export_rate,
                'self_consumption_pct': round(self_pct * 100.0, 1),
                'self_consumed_kwh': self_consumed_kwh,
                'exported_kwh': exported_kwh,
                'self_consumption_savings': self_consumption_savings,
                'export_credit': export_credit,
                'total_estimated_benefit': total_net_benefit,
                'gross_reference_value': gross_value,
                'is_simplified': False,
                'disclaimer': ("Calculated from modeled self-consumption fraction and grid feed-in rates. "
                               "Actual utility bill savings depend on net-metering settlement cycles and fixed tariff surcharges.")
            }
        else:
            # Fallback simplified gross value
            return {
                'model_type': 'SIMPLIFIED_GROSS_VALUE',
                'energy_generated_kwh': round(energy_kwh, 2),
                'retail_tariff': retail_tariff,
                'export_tariff': 0.0,
                'self_consumption_pct': 100.0,
                'self_consumed_kwh': round(energy_kwh, 2),
                'exported_kwh': 0.0,
                'self_consumption_savings': gross_value,
                'export_credit': 0.0,
                'total_estimated_benefit': gross_value,
                'gross_reference_value': gross_value,
                'is_simplified': True,
                'disclaimer': ("Simplified Gross Estimate: assumes 100% on-site self-consumption at the retail tariff rate. "
                               "This is an indicative valuation, not a guaranteed utility billing credit.")
            }
