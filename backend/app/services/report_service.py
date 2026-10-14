import os
import io
import csv
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from app.config import Config

class ReportService:
    @staticmethod
    def generate_pdf_report(plant, report_type, start_date, end_date, summary_metrics, alert_summary, maintenance_summary, savings_summary):
        """
        Generates a comprehensive industrial PDF report using ReportLab.
        Returns bytes buffer containing the PDF file.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor('#0F172A'),
            fontName='Helvetica-Bold'
        )
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#64748B'),
            fontName='Helvetica'
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            fontName='Helvetica-Bold',
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155')
        )
        disclaimer_style = ParagraphStyle(
            'ReportDisclaimer',
            parent=styles['Italic'],
            fontSize=8,
            leading=11,
            textColor=colors.HexColor('#64748B')
        )

        elements = []

        # Header banner
        header_text = f"SOLAR POWER PLANT MONITORING SYSTEM — {report_type.upper()} REPORT"
        elements.append(Paragraph(header_text, title_style))
        elements.append(Spacer(1, 4))
        
        gen_timestamp = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
        sub_info = f"<b>Plant:</b> {plant.name} ({plant.id}) &nbsp;|&nbsp; <b>Location:</b> {plant.location} &nbsp;|&nbsp; <b>Generated:</b> {gen_timestamp}"
        elements.append(Paragraph(sub_info, subtitle_style))
        elements.append(Spacer(1, 8))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=10))

        # 1. Executive Summary & Plant Specifications
        elements.append(Paragraph("1. Plant Overview & Reporting Period", section_style))
        
        data_src_label = "DEMO / SIMULATED READINGS" if plant.is_demo_mode else "EXTERNAL PHYSICAL SENSORS / GATEWAY"
        
        specs_data = [
            [Paragraph("<b>Reporting Interval:</b>", body_style), Paragraph(f"{start_date} to {end_date}", body_style),
             Paragraph("<b>Installed Capacity:</b>", body_style), Paragraph(f"{plant.installed_capacity_kwp:.1f} kWp", body_style)],
            [Paragraph("<b>Data Source:</b>", body_style), Paragraph(f"<font color='#0284C7'><b>{data_src_label}</b></font>", body_style),
             Paragraph("<b>Panel Count & Rating:</b>", body_style), Paragraph(f"{plant.panel_count} × {plant.rated_panel_power_wp} Wp", body_style)],
            [Paragraph("<b>Inverter Rating:</b>", body_style), Paragraph(f"{plant.inverter_capacity_kw:.1f} kW", body_style),
             Paragraph("<b>Retail Tariff:</b>", body_style), Paragraph(f"{Config.DEFAULT_CURRENCY}{plant.electricity_tariff:.2f} / kWh", body_style)]
        ]
        
        t_specs = Table(specs_data, colWidths=[120, 150, 120, 150])
        t_specs.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_specs)
        elements.append(Spacer(1, 10))

        # 2. Generation & Key Performance Metrics
        elements.append(Paragraph("2. Energy Generation & Performance Indicators", section_style))
        
        pr_str = f"{summary_metrics.get('performance_ratio_pct', 0.0):.1f}%" if summary_metrics.get('performance_ratio_pct') is not None else "N/A"
        
        metrics_data = [
            ['Metric Description', 'Value', 'Unit', 'Engineering Benchmark / Reference'],
            ['Total Energy Generated', f"{summary_metrics.get('total_energy_kwh', 0.0):,.1f}", 'kWh', 'Numerically integrated AC power'],
            ['Daily Average Generation', f"{summary_metrics.get('daily_avg_kwh', 0.0):,.1f}", 'kWh/day', 'Historical mean across active days'],
            ['Specific Yield (Yf)', f"{summary_metrics.get('specific_yield_kwh_kwp', 0.0):.2f}", 'kWh/kWp', 'Target: >= 3.8 kWh/kWp/day'],
            ['Performance Ratio (PR)', pr_str, '%', f"Plant Expected Target: {plant.expected_pr or 80.0}%"],
            ['Peak Recorded Power', f"{summary_metrics.get('peak_power_kw', 0.0):.1f}", 'kW', f"Installed DC: {plant.installed_capacity_kwp:.1f} kWp"],
            ['Plant Availability', f"{summary_metrics.get('plant_availability_pct', 99.0):.1f}", '%', 'Operational daylight availability']
        ]

        t_metrics = Table(metrics_data, colWidths=[170, 90, 70, 210])
        t_metrics.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#0F172A')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOTTOMPADDING', (0,0), (-1,0), 5),
            ('TOPPADDING', (0,0), (-1,0), 5),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor('#FFFFFF')),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('FONTSIZE', (0,1), (-1,-1), 8.5),
            ('TOPPADDING', (0,1), (-1,-1), 4),
            ('BOTTOMPADDING', (0,1), (-1,-1), 4),
        ]))
        elements.append(t_metrics)
        elements.append(Spacer(1, 10))

        # 3. Financial Benefits & Cost Savings
        elements.append(Paragraph("3. Economic Valuation & Cost Savings Analysis", section_style))
        
        savings_data = [
            ['Component', 'Energy Amount', 'Tariff Applied', 'Calculated Benefit'],
            ['Self-Consumed Solar Energy', f"{savings_summary.get('self_consumed_kwh', 0.0):,.1f} kWh",
             f"{Config.DEFAULT_CURRENCY}{savings_summary.get('retail_tariff', plant.electricity_tariff):.2f} / kWh",
             f"{Config.DEFAULT_CURRENCY}{savings_summary.get('self_consumption_savings', 0.0):,.2f}"],
            ['Grid Export Feed-in Credit', f"{savings_summary.get('exported_kwh', 0.0):,.1f} kWh",
             f"{Config.DEFAULT_CURRENCY}{savings_summary.get('export_tariff', plant.export_tariff):.2f} / kWh",
             f"{Config.DEFAULT_CURRENCY}{savings_summary.get('export_credit', 0.0):,.2f}"],
            ['Total Estimated Economic Benefit', f"{savings_summary.get('energy_generated_kwh', 0.0):,.1f} kWh",
             'Combined Dual-Tariff', f"<b>{Config.DEFAULT_CURRENCY}{savings_summary.get('total_estimated_benefit', 0.0):,.2f}</b>"]
        ]
        
        t_savings = Table(savings_data, colWidths=[170, 110, 120, 140])
        t_savings.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 9),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('BACKGROUND', (0,1), (-1,-2), colors.white),
            ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#ECFDF5')),
            ('FONTSIZE', (0,1), (-1,-1), 8.5),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_savings)
        elements.append(Spacer(1, 10))

        # 4. Fault Detection & Maintenance Summary
        elements.append(Paragraph("4. Fault Anomalies & Corrective Maintenance Summary", section_style))
        
        ops_data = [
            [Paragraph("<b>Active Fault Alerts:</b>", body_style), Paragraph(str(alert_summary.get('active_count', 0)), body_style),
             Paragraph("<b>Resolved Alerts:</b>", body_style), Paragraph(str(alert_summary.get('resolved_count', 0)), body_style)],
            [Paragraph("<b>Critical Violations:</b>", body_style), Paragraph(str(alert_summary.get('critical_count', 0)), body_style),
             Paragraph("<b>Completed Maintenance:</b>", body_style), Paragraph(str(maintenance_summary.get('completed_count', 0)), body_style)],
            [Paragraph("<b>Pending Work Orders:</b>", body_style), Paragraph(str(maintenance_summary.get('pending_count', 0)), body_style),
             Paragraph("<b>Latest Maintenance:</b>", body_style), Paragraph(str(maintenance_summary.get('latest_task_title', 'Module Cleaning')), body_style)]
        ]
        t_ops = Table(ops_data, colWidths=[130, 140, 130, 140])
        t_ops.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        elements.append(t_ops)
        elements.append(Spacer(1, 14))

        # Engineering and Legal Disclaimer
        disclaimer_text = (
            "<b>Engineering Project Note:</b> Generated by the Solar Power Plant Monitoring and Performance Analysis "
            "System for academic and industrial evaluation. Energy calculations utilize composite trapezoidal numerical integration "
            "with outage gap bounds. Performance Ratio (PR) follows IEC 61724 standards. Estimated financial metrics represent indicative "
            "operational savings based on configured retail and feed-in tariff schedules."
        )
        elements.append(Paragraph(disclaimer_text, disclaimer_style))

        # Build document
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def generate_csv_export(readings):
        """
        Exports raw generation telemetry to standard CSV format.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        
        writer.writerow([
            'Timestamp',
            'Plant_ID',
            'Is_Simulated',
            'Solar_Irradiance_W_m2',
            'Ambient_Temperature_C',
            'Panel_Temperature_C',
            'DC_Voltage_V',
            'DC_Current_A',
            'DC_Power_kW',
            'AC_Voltage_V',
            'AC_Current_A',
            'AC_Power_kW',
            'Grid_Frequency_Hz',
            'Inverter_Efficiency_Pct',
            'Daily_Energy_kWh',
            'Expected_Power_kW'
        ])
        
        for r in readings:
            writer.writerow([
                r.timestamp.isoformat() if r.timestamp else '',
                r.plant_id,
                r.is_simulated,
                r.solar_irradiance_w_m2,
                r.ambient_temperature_c,
                r.panel_temperature_c,
                r.dc_voltage,
                r.dc_current,
                r.dc_power_kw,
                r.ac_voltage,
                r.ac_current,
                r.ac_power_kw,
                r.grid_frequency_hz,
                r.inverter_efficiency_pct,
                r.daily_energy_kwh,
                r.expected_power_kw
            ])
            
        return output.getvalue()
