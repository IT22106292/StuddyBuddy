import { useEffect, useState } from 'react';
import { Dimensions, View } from 'react-native';

// Web environment detection
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// Conditional chart imports based on platform
let ChartComponent;
let ChartJS;
if (isWeb) {
  // Web: Use Chart.js
  ChartJS = require('chart.js');
  // Register necessary components
  if (typeof window !== 'undefined') {
    ChartJS.Chart.register(
      ChartJS.CategoryScale,
      ChartJS.LinearScale,
      ChartJS.PointElement,
      ChartJS.LineElement,
      ChartJS.BarElement,
      ChartJS.Title,
      ChartJS.Tooltip,
      ChartJS.Legend,
      ChartJS.Filler,
      ChartJS.ArcElement
    );
  }
  ChartComponent = require('react-chartjs-2');
} else {
  // Mobile: Use react-native-chart-kit
  ChartComponent = { 
    BarChart: require('react-native-chart-kit').BarChart,
    LineChart: require('react-native-chart-kit').LineChart,
    PieChart: require('react-native-chart-kit').PieChart
  };
}

// Chart configuration constants
const CHART_HEIGHT = 150;
const CHART_WIDTH = Dimensions.get('window').width * 0.9;

// Color scheme - Purple and Cyan
const colorPalette = [
  '#6366f1', // Purple - for new users
  '#22d3ee', // Cyan - for returning users
];

// Web chart options
const webChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
      labels: {
        color: '#333',
        font: {
          size: 10
        },
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 15
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#6366f1',
      borderWidth: 1,
      padding: 10,
      displayColors: true,
      callbacks: {
        label: function(context) {
          return context.dataset.label + ': ' + context.parsed.y + ' users';
        }
      }
    }
  },
  scales: {
    x: {
      type: 'category',
      ticks: {
        color: '#666',
        font: {
          size: 10
        }
      },
      grid: {
        display: false
      }
    },
    y: {
      type: 'linear',
      beginAtZero: true,
      ticks: {
        color: '#666',
        font: {
          size: 10
        },
        stepSize: 5
      },
      grid: {
        color: 'rgba(0, 0, 0, 0.1)'
      }
    }
  }
};

// Mobile chart configuration
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
    borderRadius: 16
  },
  propsForDots: {
    r: '4',
    strokeWidth: '2',
    stroke: '#6366f1'
  }
};

const UserGrowthChart = ({ users }) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!users || users.length === 0) return;

    // Calculate user growth data (last 7 days)
    const now = new Date();
    const dates = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    // Calculate new users and returning users for each day
    const newUsersData = [];
    const returningUsersData = [];
    
    dates.forEach((dateStr, index) => {
      const date = new Date(dateStr);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));
      
      // Count new users who joined on this day
      const newUsers = users.filter(user => {
        const joinDate = user.createdAt?.toDate?.() || user.joinDate?.toDate?.() || new Date(0);
        return joinDate >= startOfDay && joinDate <= endOfDay;
      }).length;
      
      // Count total users who were active before this day (returning users)
      const previousDate = new Date(startOfDay);
      previousDate.setDate(previousDate.getDate() - 1);
      
      const returningUsers = users.filter(user => {
        const joinDate = user.createdAt?.toDate?.() || user.joinDate?.toDate?.() || new Date(0);
        return joinDate <= previousDate;
      }).length;
      
      // For demo purposes, show some returning users (you can modify this logic)
      const activeReturningUsers = Math.floor(returningUsers * 0.3); // 30% of previous users are active
      
      newUsersData.push(newUsers);
      returningUsersData.push(activeReturningUsers);
    });

    if (isWeb) {
      setChartData({
        labels: dates.map(d => {
          const date = new Date(d);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
          {
            label: 'New Users',
            data: newUsersData,
            backgroundColor: colorPalette[0],
            borderRadius: 25,
            borderSkipped: false,
            barThickness: 8,
            maxBarThickness: 8
          },
          {
            label: 'Active Users',
            data: returningUsersData,
            backgroundColor: colorPalette[1],
            borderRadius: 25,
            borderSkipped: false,
            barThickness: 8,
            maxBarThickness: 8
          }
        ]
      });
    } else {
      setChartData({
        labels: dates.map(d => d.slice(5)),
        datasets: [{ data: newUsersData.map((v, i) => v + returningUsersData[i]) }]
      });
    }
  }, [users]);

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
                text: 'User Activity (Last 7 Days)',
                color: '#333',
                font: {
                  size: 12,
                  weight: 'bold'
                }
              }
            }
          }}
        />
      </View>
    );
  } else {
    return (
      <ChartComponent.BarChart
        data={chartData}
        width={CHART_WIDTH}
        height={CHART_HEIGHT}
        chartConfig={mobileChartConfig}
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
        withShadow={false}
        withInnerLines={false}
        yAxisLabel=""
        yAxisSuffix=""
        yAxisInterval={5}
        fromZero
      />
    );
  }
};

export default UserGrowthChart;