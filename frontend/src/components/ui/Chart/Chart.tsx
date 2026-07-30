import React from "react";
import ReactApexChart from "react-apexcharts";
import { ApexOptions } from "apexcharts";

export interface ChartProps {
  type: "line" | "bar" | "area" | "histogram" | "pie" | "donut" | "radialBar";
  series: {
    name: string;
    data: number[];
  }[];
  categories?: string[];
  title?: string;
  height?: number | string;
  horizontal?: boolean;
}

export const Chart: React.FC<ChartProps> = ({
  type,
  series,
  categories,
  title,
  height = 300,
  horizontal = false
}) => {
  const chartType = type === "histogram" ? "bar" : type;

  const options: ApexOptions = {
    chart: {
      id: "app-chart",
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif"
    },
    title: title ? {
      text: title,
      align: "left",
      style: { fontSize: "14px", fontWeight: "600" }
    } : undefined,
    xaxis: categories ? {
      categories: categories
    } : undefined,
    plotOptions: {
      bar: {
        horizontal: horizontal,
        columnWidth: "55%",
        borderRadius: 4
      }
    },
    dataLabels: {
      enabled: false
    },
    theme: {
      mode: "light",
      palette: "palette1"
    },
    colors: ["#4353ff", "#10b981", "#ef4444", "#f59e0b"]
  };

  return (
    <div className="w-full">
      <ReactApexChart
        options={options}
        series={series}
        type={chartType}
        height={height}
      />
    </div>
  );
};
