import { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';

// Detect web vs mobile
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// Conditional chart imports
let ChartComponent;
let ChartJS;
if (isWeb) {
  ChartJS = require('chart.js');
  if (typeof window !== 'undefined') {
    ChartJS.Chart.register(
      ChartJS.CategoryScale,
      ChartJS.LinearScale,
      ChartJS.BarElement,
      ChartJS.PointElement,
      ChartJS.LineElement,
      ChartJS.Title,
      ChartJS.Tooltip,
      ChartJS.Legend,
      ChartJS.Filler,
      ChartJS.ArcElement
    );
  }
  ChartComponent = require('react-chartjs-2');
} else {
  ChartComponent = {
    BarChart: require('react-native-chart-kit').BarChart,
    LineChart: require('react-native-chart-kit').LineChart,
    PieChart: require('react-native-chart-kit').PieChart,
  };
}

// Chart constants
const CHART_HEIGHT = 180;
const CHART_WIDTH = Dimensions.get('window').width * 0.9;

// Modern clean Chart.js look
const webChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#2D2D3A',
      titleColor: '#FFFFFF',
      bodyColor: '#A5B4FC',
      cornerRadius: 8,
      padding: 10,
      displayColors: false,
      callbacks: {
        // Remove percentage; only show visitor count
        title: () => null,
        label: (context) => `${context.dataset.data[context.dataIndex]} Visitors`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: 'rgba(100, 116, 139, 0.7)',
        font: { size: 11 },
      },
    },
    y: {
      grid: { display: false },
      ticks: { display: false },
    },
  },
  elements: {
    bar: {
      borderRadius: 8,
      borderSkipped: false,
    },
  },
  animation: {
    duration: 1000,
    easing: 'easeOutQuart',
  },
};

// Mobile chart config (unchanged)
const mobileChartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: '#fff',
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#6366f1',
  },
};

const ContentDistributionChart = ({ resources, videos }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!resources || !videos) return;

    const subjectCounts = {};

    // Count resources
    resources.forEach((resource) => {
      const subject = resource.subject || 'Uncategorized';
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    // Count videos
    videos.forEach((video) => {
      const subject = video.subject || 'Uncategorized';
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });

    const subjects = Object.keys(subjectCounts);
    const counts = Object.values(subjectCounts);

    if (isWeb) {
      // Web Chart.js dataset with smooth pastel style
      setChartData({
        labels: subjects,
        datasets: [
          {
            label: 'Visitors',
            data: counts,
            backgroundColor: 'rgba(147, 51, 234, 0.3)', // soft purple
            hoverBackgroundColor: 'rgba(147, 51, 234, 0.9)', // bright purple on hover
            borderRadius: 8,
            borderSkipped: false,
            borderWidth: 0,
          },
        ],
      });
    } else {
      // Mobile Pie Chart dataset
      const pieData = subjects.map((subject, index) => ({
        name: subject.length > 10 ? subject.substring(0, 10) + '...' : subject,
        population: counts[index],
        color: [
          '#6366f1',
          '#10b981',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
          '#3b82f6',
        ][index % 6],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12,
      }));
      setChartData(pieData);
    }
  }, [resources, videos]);

  if (!chartData) return null;

  if (isWeb) {
    return (
      <View style={{ height: CHART_HEIGHT, width: '100%' }}>
        <ChartComponent.Bar
          data={chartData}
          options={{
            ...webChartOptions,
            plugins: {
              ...webChartOptions.plugins,
              title: {
                display: true,
                text: 'Content Distribution by Subject',
                color: '#333',
                font: { size: 12, weight: 'bold' },
              },
            },
            scales: {
              ...webChartOptions.scales,
              x: {
                ...webChartOptions.scales.x,
                ticks: {
                  ...webChartOptions.scales.x.ticks,
                  autoSkip: false,
                  maxRotation: 45,
                  minRotation: 45,
                },
              },
            },
          }}
        />
      </View>
    );
  } else {
    return (
      <ChartComponent.PieChart
        data={chartData}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={mobileChartConfig}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
      />
    );
  }
};

export default ContentDistributionChart;
