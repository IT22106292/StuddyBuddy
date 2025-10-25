import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Web environment detection
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

// Conditional chart imports based on platform
let ChartComponent;
if (isWeb) {
  // Web: Use Chart.js
  const ChartJS = require('chart.js');
  // Register necessary components
  if (typeof window !== 'undefined') {
    ChartJS.Chart.register(
      ChartJS.CategoryScale,
      ChartJS.LinearScale,
      ChartJS.PointElement,
      ChartJS.LineElement,
      ChartJS.Title,
      ChartJS.Tooltip,
      ChartJS.Legend,
      ChartJS.Filler
    );
  }
  ChartComponent = require('react-chartjs-2').Line;
} else {
  // Mobile: Use react-native-chart-kit
  ChartComponent = require('react-native-chart-kit').LineChart;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

const MonthlyUserGrowthChart = ({ users, tutors }) => {
  const [chartData, setChartData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedMonthData, setSelectedMonthData] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);

  console.log('MonthlyUserGrowthChart received props:', {
    usersCount: users ? users.length : 0,
    tutorsCount: tutors ? tutors.length : 0
  });

  // Check if a user is a tutor
  const isUserTutor = (user) => {
    // Create a comprehensive map of tutor identifiers for matching
    const tutorIdentifiers = new Map();
    
    if (tutors && Array.isArray(tutors)) {
      tutors.forEach(tutor => {
        // Map by ID
        if (tutor.id) {
          tutorIdentifiers.set(`id:${tutor.id}`, tutor);
        }
        // Map by email
        if (tutor.email) {
          tutorIdentifiers.set(`email:${tutor.email}`, tutor);
        }
        // Map by name if available
        const tutorName = tutor.fullName || tutor.name;
        if (tutorName) {
          tutorIdentifiers.set(`name:${tutorName}`, tutor);
        }
      });
    }
    
    // Check by ID
    if (user.id && tutorIdentifiers.has(`id:${user.id}`)) {
      return true;
    }
    
    // Check by email
    if (user.email && tutorIdentifiers.has(`email:${user.email}`)) {
      return true;
    }
    
    // Check by name as last resort
    const userName = user.fullName || user.name;
    if (userName && tutorIdentifiers.has(`name:${userName}`)) {
      return true;
    }
    
    // Fallback to checking user properties
    return !!(user.isTutor || user.role === 'tutor' || user.isTutor === true);
  };

  // Group users by month and ensure all months are represented
  useEffect(() => {
    // Combine users and tutors for charting (tutors are also users)
    // We use the users prop which should already contain all users including tutors
    const allUsers = users || [];
    
    if (allUsers.length === 0) {
      // Even if no users, show all months with zero counts
      const emptyMonthlyData = [];
      const currentYear = new Date().getFullYear();
      
      for (let month = 0; month < 12; month++) {
        const date = new Date(currentYear, month, 1);
        const monthKey = `${currentYear}-${String(month + 1).padStart(2, '0')}`;
        
        emptyMonthlyData.push({
          month: monthKey,
          label: date.toLocaleDateString('en-US', { month: 'short' }),
          users: [],
          count: 0
        });
      }
      
      setMonthlyData(emptyMonthlyData);
      
      // Prepare chart data with all months
      const labels = emptyMonthlyData.map(item => item.label);
      const data = emptyMonthlyData.map(item => item.count);
      
      // Calculate cumulative totals
      const cumulativeData = [];
      let total = 0;
      data.forEach(count => {
        total += count;
        cumulativeData.push(total);
      });

      if (isWeb) {
        setChartData({
          labels: labels,
          datasets: [
            {
              label: 'New Users',
              data: data,
              fill: true,
              backgroundColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
                gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
                gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                return gradient;
              },
              borderColor: (context) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, screenWidth, 0);
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(0.5, '#8b5cf6');
                gradient.addColorStop(1, '#ec4899');
                return gradient;
              },
              borderWidth: 3,
              tension: 0.4,
              pointRadius: 2,
              pointHoverRadius: 7,
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderWidth: 3,
              pointHoverBorderColor: '#8b5cf6',
            },
            {
              label: 'Cumulative Users',
              data: cumulativeData,
              fill: false,
              borderColor: '#94a3b8',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderWidth: 2,
              pointHoverBorderColor: '#94a3b8',
            }
          ]
        });
      } else {
        setChartData({
          labels: labels, // Now directly using the short month names
          datasets: [{ data: cumulativeData }]
        });
      }
      
      return;
    }

    // Create an object to hold monthly data for all months with user data
    const monthlyUsers = {};
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // First, collect all months that have users
    const allMonths = new Set();
    allUsers.forEach(user => {
      const joinDate = user.createdAt?.toDate?.() || user.joinDate?.toDate?.() || new Date();
      const monthKey = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
      allMonths.add(monthKey);
    });
    
    // Also include the last 12 months to ensure we have a complete view
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      allMonths.add(monthKey);
    }
    
    // Initialize all collected months with zero counts
    Array.from(allMonths).sort().forEach(monthKey => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      monthlyUsers[monthKey] = {
        month: monthKey,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
        users: [],
        count: 0
      };
    });
    
    // Process each user and assign to appropriate month
    allUsers.forEach(user => {
      const joinDate = user.createdAt?.toDate?.() || user.joinDate?.toDate?.() || new Date();
      const monthKey = `${joinDate.getFullYear()}-${String(joinDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Include data for all months (not just the past 12)
      if (monthlyUsers[monthKey]) {
        monthlyUsers[monthKey].users.push(user);
        monthlyUsers[monthKey].count += 1;
      } else {
        // If the month doesn't exist in our map, create it
        const date = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
        const label = date.toLocaleDateString('en-US', { month: 'short' });
        monthlyUsers[monthKey] = {
          month: monthKey,
          label: label,
          users: [user],
          count: 1
        };
      }
    });
    
    // Debug information
    console.log('Monthly data processing:', {
      totalUsers: allUsers.length,
      monthsWithData: Object.keys(monthlyUsers).length,
      monthlyCounts: Object.values(monthlyUsers).map(m => ({ 
        month: m.label, 
        count: m.count,
        users: m.users.length
      }))
    });

    // Convert to array and sort by month
    const sortedMonthlyData = Object.values(monthlyUsers).sort((a, b) => {
      return a.month.localeCompare(b.month);
    });

    setMonthlyData(sortedMonthlyData);

    // Prepare chart data
    const labels = sortedMonthlyData.map(item => item.label);
    const data = sortedMonthlyData.map(item => item.count);
    
    // Calculate cumulative totals
    const cumulativeData = [];
    let total = 0;
    data.forEach(count => {
      total += count;
      cumulativeData.push(total);
    });

    if (isWeb) {
      setChartData({
        labels: labels,
        datasets: [
          {
            label: 'New Users',
            data: data,
            fill: true,
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 300);
              gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
              gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.15)');
              gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
              return gradient;
            },
            borderColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, screenWidth, 0);
              gradient.addColorStop(0, '#3b82f6');
              gradient.addColorStop(0.5, '#8b5cf6');
              gradient.addColorStop(1, '#ec4899');
              return gradient;
            },
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 7,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderWidth: 3,
            pointHoverBorderColor: '#8b5cf6',
          },
          {
            label: 'Cumulative Users',
            data: cumulativeData,
            fill: false,
            borderColor: '#94a3b8',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderWidth: 2,
            pointHoverBorderColor: '#94a3b8',
          }
        ]
      });
    } else {
      setChartData({
        labels: labels, // Now directly using the short month names
        datasets: [{ data: cumulativeData }]
      });
    }
  }, [users, tutors]);

  const handlePointClick = (event, elements) => {
    if (elements.length > 0) {
      const elementIndex = elements[0].index;
      const selectedData = monthlyData[elementIndex];
      
      if (selectedData) {
        // Sort users by join date (ascending)
        const sortedUsers = [...selectedData.users].sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.joinDate?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.joinDate?.toDate?.() || new Date(0);
          return dateA - dateB;
        });
        
        setSelectedMonthData({
          ...selectedData,
          users: sortedUsers
        });
        setModalVisible(true);
      }
    }
  };

  const webChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#666',
          font: {
            size: 11,
            weight: '500'
          },
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15
        }
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        usePointStyle: true,
        boxPadding: 6,
        titleFont: {
          size: 13,
          weight: '600'
        },
        bodyFont: {
          size: 14,
          weight: '700'
        },
        cornerRadius: 8,
        caretSize: 6,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          }
        },
        grid: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        type: 'linear',
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          },
          precision: 0
        },
        grid: {
          color: '#f1f5f9',
          drawBorder: false
        },
        border: {
          display: false
        },
        beginAtZero: true
      }
    },
    onClick: handlePointClick
  };

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
      r: '6',
      strokeWidth: '2',
      stroke: '#6366f1'
    }
  };

  if (!chartData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.chartHeader}>
        <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
        <Text style={styles.chartTitle}>Monthly User Growth Trend</Text>
      </View>
      
      <View style={styles.chartContainer}>
        {isWeb ? (
          <div style={{ height: 300, width: '100%' }}>
            <ChartComponent 
              data={chartData} 
              options={webChartOptions}
            />
          </div>
        ) : (
          <ChartComponent
            data={chartData}
            width={screenWidth * 0.9}
            height={220}
            chartConfig={mobileChartConfig}
            bezier
            style={styles.chart}
            withShadow={false}
            withInnerLines={false}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={1}
            fromZero
          />
        )}
      </View>

      {/* Modal for showing users in selected month */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedMonthData?.label} - {selectedMonthData?.count || 0} New Users
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            {selectedMonthData?.users && selectedMonthData.users.length > 0 ? (
              <ScrollView style={styles.modalContent}>
                {selectedMonthData.users.map((user, index) => (
                  <View key={user.id} style={styles.userItem}>
                    <View style={styles.userIndex}>
                      <Text style={styles.userIndexText}>{index + 1}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {user.fullName || user.name || 'Anonymous User'}
                      </Text>
                      <Text style={styles.userEmail}>
                        {user.email || 'No email provided'}
                      </Text>
                    </View>
                    <View style={styles.userBadges}>
                      {isUserTutor(user) && (
                        <View style={styles.tutorBadge}>
                          <Ionicons name="school" size={12} color="#8B5CF6" />
                          <Text style={styles.tutorBadgeText}>Tutor</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.userDate}>
                      <Text style={styles.userDateText}>
                        {(user.createdAt?.toDate?.() || user.joinDate?.toDate?.() || new Date()).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.modalContent}>
                <Text style={styles.emptyText}>No users registered in this month</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isMobile ? 16 : 20,
    marginBottom: 16,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: isMobile ? 13 : 14,
    fontWeight: '700',
    color: '#111827',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16
  },
  mobileNote: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  mobileNoteText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    padding: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  userBadges: {
    flexDirection: 'row',
    marginRight: 12,
  },
  tutorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  tutorBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  userDate: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  userDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  emptyText: {
    padding: 16,
    textAlign: 'center',
    color: '#6B7280',
  },
});

export default MonthlyUserGrowthChart;