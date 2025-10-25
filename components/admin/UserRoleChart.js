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
const CHART_HEIGHT = 100; // Reduced from 120 to 100
const CHART_WIDTH = Dimensions.get('window').width * 0.6; // Reduced from 0.7 to 0.6

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
          size: 11,
          family: 'sans-serif'
        }
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#6366f1',
      borderWidth: 1,
      callbacks: {
        label: function(context) {
          return `${context.label}: ${context.raw}`;
        }
      },
      titleFont: {
        size: 11,
        family: 'sans-serif'
      },
      bodyFont: {
        size: 11,
        family: 'sans-serif'
      }
    }
  },
  scales: {
    x: {
      type: 'category',
      ticks: {
        color: '#666',
        font: {
          size: 11,
          family: 'sans-serif'
        }
      },
      grid: {
        display: false
      }
    },
    y: {
      type: 'linear',
      ticks: {
        color: '#666',
        font: {
          size: 11,
          family: 'sans-serif'
        }
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
  strokeWidth: 1, // Reduced from 2 to 1 (thinner)
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
  decimalPlaces: 0,
  style: {
    borderRadius: 16
  },
  propsForDots: {
    r: '3', // Reduced from 4 to 3 (thinner)
    strokeWidth: '1', // Reduced from 2 to 1 (thinner)
    stroke: '#6366f1'
  },
  fontFamily: 'sans-serif'
};

// CSS-based Circular Chart Component (Web only)
const CircularProgressChart = ({ data, centerValue }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  
  const size = 180; // Reduced from 200 to 180
  const strokeWidth = 16; // Reduced from 20 to 16 (thinner)
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  if (!isWeb) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px', // Reduced from 20px
      backgroundColor: '#fff'
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'scale(1)' }}>
          {/* Background circles */}
          {data.map((item, index) => (
            <circle
              key={`bg-${index}`}
              cx={center}
              cy={center}
              r={radius - (index * (strokeWidth + 4))} // Reduced spacing
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
              style={{ 
                transition: 'all 0.3s ease'
              }}
            />
          ))}
          
          {/* Progress circles */}
          {data.map((item, index) => {
            const currentRadius = radius - (index * (strokeWidth + 4)); // Reduced spacing
            const currentCircumference = 2 * Math.PI * currentRadius;
            const dashOffset = currentCircumference - (currentCircumference * item.percentage) / 100; // Fixed typo here
            
            return (
              <circle
                key={`progress-${index}`}
                cx={center}
                cy={center}
                r={currentRadius}
                fill="none"
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={currentCircumference}
                strokeDashoffset={dashOffset}
                style={{
                  transform: 'rotate(-90deg)',
                  transformOrigin: 'center',
                  transition: 'all 1s ease-out',
                  filter: hoveredIndex === index ? 'brightness(1.2)' : 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>
        
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '32px', // Reduced from 36px
              fontWeight: 'bold',
              color: '#6366f1',
              fontFamily: 'sans-serif'
            }}>
              {centerValue}
            </div>
          </div>
        </div>
      </div>
      
      {/* Legend with counts */}
      <div style={{
        display: 'flex',
        gap: '12px', // Reduced from 16px
        marginTop: '12px' // Reduced from 16px
      }}>
        {data.map((item, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px', // Reduced from 6px
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              transform: hoveredIndex === index ? 'scale(1.1)' : 'scale(1)'
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              style={{
                width: '10px', // Reduced from 12px
                height: '10px', // Reduced from 12px
                borderRadius: '50%',
                backgroundColor: item.color
              }}
            />
            <span style={{
              color: '#666',
              fontWeight: '500',
              fontSize: '11px',
              fontFamily: 'sans-serif'
            }}>
              {item.name}
            </span>
            <span style={{
              color: '#999',
              fontSize: '11px',
              fontFamily: 'sans-serif',
              marginLeft: '4px'
            }}>
              ({item.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserRoleChart = ({ users, tutors, chartType = 'circular' }) => {
  const [chartData, setChartData] = useState(null);
  const [circularData, setCircularData] = useState(null);

  useEffect(() => {
    if (!users) return;

    const totalUsers = users.length;
    const totalTutors = tutors ? tutors.length : 0;
    const totalStudents = totalUsers - totalTutors;
    const studentPercentage = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 0;
    const tutorPercentage = totalUsers > 0 ? Math.round((totalTutors / totalUsers) * 100) : 0;

    // Data for circular chart
    setCircularData([
      {
        name: 'Students',
        count: totalStudents,
        percentage: studentPercentage,
        color: '#22d3ee'
      },
      {
        name: 'Tutors',
        count: totalTutors,
        percentage: tutorPercentage,
        color: '#8b5cf6'
      }
    ]);

    if (isWeb) {
      setChartData({
        labels: ['Students', 'Tutors'],
        datasets: [
          {
            label: 'User Roles',
            data: [totalStudents, totalTutors],
            backgroundColor: [
              'rgba(16, 185, 129, 0.7)',
              'rgba(99, 102, 241, 0.7)'
            ],
            borderColor: [
              'rgba(16, 185, 129, 1)',
              'rgba(99, 102, 241, 1)'
            ],
            borderWidth: 1
          }
        ]
      });
    } else {
      setChartData([
        {
          name: 'Students',
          population: totalStudents,
          color: '#10b981',
          legendFontColor: '#7F7F7F',
          legendFontSize: 11 // Match ContentDistributionChart font size
        },
        {
          name: 'Tutors',
          population: totalTutors,
          color: '#6366f1',
          legendFontColor: '#7F7F7F',
          legendFontSize: 11 // Match ContentDistributionChart font size
        }
      ]);
    }
  }, [users, tutors]);

  if (!chartData || !circularData) return null;

  const totalUsers = users.length;
  const totalTutors = tutors ? tutors.length : 0;
  const totalStudents = totalUsers - totalTutors;
  const studentPercentage = totalUsers > 0 ? Math.round((totalStudents / totalUsers) * 100) : 0;

  // Circular chart (Web only)
  if (isWeb && chartType === 'circular') {
    return (
      <CircularProgressChart 
        data={circularData} 
        centerValue={`${studentPercentage}%`}
      />
    );
  }

  // Original pie chart implementation
  if (isWeb) {
    return (
      <View style={{ height: CHART_HEIGHT, width: '100%' }}>
        <ChartComponent.Pie 
          data={chartData} 
          options={{
            ...webChartOptions,
            plugins: {
              ...webChartOptions.plugins,
              tooltip: {
                ...webChartOptions.plugins.tooltip,
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ${context.raw}`;
                  }
                }
              },
              title: {
                display: true,
                text: 'User Roles Distribution',
                color: '#333',
                font: {
                  size: 12,
                  weight: 'bold',
                  family: 'sans-serif'
                }
              }
            }
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
        paddingLeft="10" // Reduced from 15
        absolute
        style={{
          marginVertical: 6, // Reduced from 8
          borderRadius: 16
        }}
      />
    );
  }
};

export default UserRoleChart;