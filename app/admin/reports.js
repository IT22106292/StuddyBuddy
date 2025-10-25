import { Ionicons } from "@expo/vector-icons";
import * as Print from 'expo-print';
import { useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../../firebase/firebaseConfig";

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

// Web environment detection
const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
const isPrintAvailable = !isWeb && typeof Print !== 'undefined' && Print.printToFileAsync;
const isSharingAvailable = !isWeb && typeof Sharing !== 'undefined' && Sharing.isAvailableAsync;

const COLORS = {
  primary: "#3B82F6",
  primaryLight: "#60A5FA",
  darkBlue: "#1E40AF",
  secondary: "#8B5CF6",
  accent: "#F59E0B",
  success: "#22C55E",
  error: "#EF4444",
  bg: "#E8EBF7",
  bgSecondary: "#E5E7EB",
  card: "#FFFFFF",
  cardGlass: "rgba(255, 255, 255, 0.7)",
  textMain: "#111827",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  shadow: "#9CA3AF",
};

const getRandomColor = (index) => {
  const colors = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#6366F1", "#EF4444"
  ];
  return colors[index % colors.length];
};

const Avatar = ({ initials, color }) => (
  <View style={[styles.avatar, { backgroundColor: color }]}>
    <Text style={styles.avatarText}>{initials}</Text>
  </View>
);

const ListCard = ({ children }) => (
  <View style={styles.listCard}>
    {children}
  </View>
);

const SectionHeader = ({ icon, title, count }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconContainer}>
      <Ionicons name={icon} size={22} color={COLORS.primary} />
    </View>
    <View style={styles.sectionHeaderText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count} total</Text>
    </View>
  </View>
);

export default function ReportsScreen({ users }) {
  const router = useRouter();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [activeButton, setActiveButton] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  
  // Animation values
  const scrollY = useRef(new Animated.Value(300)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Animate on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(scrollY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const generateReportSummary = (users, resources, videos) => {
    const totalUsers = users.length;
    const totalTutors = users.filter(u => u.isTutor).length;
    const totalResources = resources.length;
    const totalVideos = videos.length;
    
    return {
      totalUsers,
      totalTutors,
      totalStudents: totalUsers - totalTutors,
      totalResources,
      totalVideos,
      totalContent: totalResources + totalVideos
    };
  };

  const generateUserReport = (users) => {
    return {
      total: users.length,
      tutors: users.filter(u => u.isTutor).length,
      students: users.filter(u => !u.isTutor).length,
      topUsers: users
        .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
        .slice(0, 10)
        .map(u => ({
          id: u.id,
          name: u.fullName || u.name || 'Anonymous',
          email: u.email,
          reputation: u.reputation || 0,
          isTutor: u.isTutor || false
        }))
    };
  };

  const generateReport = async () => {
    setIsGeneratingReport(true);
    setActiveButton('generate');
    
    try {
      // Fetch resources and videos from Firestore
      const resourcesQuery = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'));
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const resources = resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const videosQuery = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'));
      const videosSnapshot = await getDocs(videosQuery);
      const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const reportData = {
        generatedAt: new Date(),
        summary: generateReportSummary(users, resources, videos),
        users: generateUserReport(users),
        resources: resources,
        videos: videos
      };
      
      setReportData(reportData);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const exportReport = async () => {
    setActiveButton('download');
    
    try {
      // Generate report data directly for download without showing in UI
      const resourcesQuery = query(collection(db, 'resources'), orderBy('uploadedAt', 'desc'));
      const resourcesSnapshot = await getDocs(resourcesQuery);
      const resources = resourcesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const videosQuery = query(collection(db, 'videos'), orderBy('uploadedAt', 'desc'));
      const videosSnapshot = await getDocs(videosQuery);
      const videos = videosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const reportDataForDownload = {
        generatedAt: new Date(),
        summary: generateReportSummary(users, resources, videos),
        users: generateUserReport(users),
        resources: resources,
        videos: videos
      };

      // Check if we're in a web environment or if Print is available
      if (isWeb || !isPrintAvailable) {
        // Web fallback: Create printable HTML file
        const htmlContent = generateReportHTMLWithData(reportDataForDownload);
        
        // Create a Blob with PDF-like styling
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        // Provide direct download with PDF extension (HTML file that looks like a PDF)
        const link = document.createElement('a');
        link.href = url;
        link.download = `StudyPro_Admin_Report_${new Date().toISOString().split('T')[0]}.pdf.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        // Also open in new window for printing (user can choose 'Save as PDF' in print dialog)
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Trigger print dialog after a short delay
        setTimeout(() => {
          printWindow.print();
        }, 1000);
        
        return;
      }
      
      // Generate HTML content for PDF
      const htmlContent = generateReportHTMLWithData(reportDataForDownload);
      
      // Create PDF with correct filename
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        filename: `StudyPro_Admin_Report_${new Date().toISOString().split('T')[0]}.pdf`
      });
      
      // Share the PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Admin Report - StudyPro Platform',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error) {
      console.error('Error exporting PDF report:', error);
    }
  };

  const generateReportHTMLWithData = (data) => {
    if (!data) return '';
    
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    // Generate student list HTML
    const studentListHTML = users
      .filter(u => !u.isTutor && !u.isAdmin)
      .map((student, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${student.fullName || student.name || 'Anonymous'}</td>
          <td>${student.email || 'No email'}</td>
        </tr>
      `).join('');
    
    // Generate tutor list HTML
    const tutorListHTML = users
      .filter(u => u.isTutor && !u.isAdmin)
      .map((tutor, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${tutor.fullName || tutor.name || 'Anonymous'}</td>
          <td>${tutor.email || 'No email'}</td>
        </tr>
      `).join('');
    
    // Generate resources list HTML
    const resourcesListHTML = (data.resources || [])
      .map((resource, index) => {
        const publisher = users.find(u => u.id === resource.uploadedBy) || {};
        const publisherName = publisher.fullName || publisher.name || publisher.email || 'Unknown';
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${resource.title || resource.fileName || 'Untitled Resource'}</td>
          <td>${publisherName}</td>
        </tr>
      `;}).join('');
    
    // Generate videos list HTML
    const videosListHTML = (data.videos || [])
      .map((video, index) => {
        const publisher = users.find(u => u.id === video.uploadedBy) || {};
        const publisherName = publisher.fullName || publisher.name || publisher.email || 'Unknown';
        return `
        <tr>
          <td>${index + 1}</td>
          <td>${video.title || 'Untitled Video'}</td>
          <td>${publisherName}</td>
        </tr>
      `;}).join('');
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>StudyPro Admin Report</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f8fafc;
                color: #1e293b;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 10px;
            }
            .header h1 {
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .header p {
                margin: 5px 0 0 0;
                opacity: 0.9;
                font-size: 16px;
            }
            .report-meta {
                background: white;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
            }
            .section {
                background: white;
                margin-bottom: 20px;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #e2e8f0;
            }
            .section-header {
                background: #f1f5f9;
                padding: 15px 20px;
                border-bottom: 1px solid #e2e8f0;
            }
            .section-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #334155;
            }
            .section-content {
                padding: 20px;
            }
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 20px;
            }
            .metric-card {
                background: #f8fafc;
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #3b82f6;
                text-align: center;
            }
            .metric-value {
                font-size: 24px;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 5px;
            }
            .metric-label {
                font-size: 12px;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
            }
            .table th {
                background: #f1f5f9;
                padding: 12px;
                text-align: left;
                font-weight: 600;
                color: #334155;
                border-bottom: 2px solid #e2e8f0;
                font-size: 12px;
                text-transform: uppercase;
            }
            .table td {
                padding: 10px 12px;
                border-bottom: 1px solid #f1f5f9;
                font-size: 14px;
            }
            .table tr:nth-child(even) {
                background: #f8fafc;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding: 20px;
                color: #64748b;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📈 StudyPro Admin Report</h1>
            <p>Comprehensive Platform Analytics & Insights</p>
        </div>
        
        <div class="report-meta">
            <strong>Report Type:</strong> Comprehensive<br>
            <strong>Generated:</strong> ${currentDate} at ${currentTime}<br>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Platform Overview</h2>
            </div>
            <div class="section-content">
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${data.summary.totalUsers}</div>
                        <div class="metric-label">Total Users</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.summary.totalTutors}</div>
                        <div class="metric-label">Active Tutors</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.summary.totalResources}</div>
                        <div class="metric-label">Resources</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${data.summary.totalVideos}</div>
                        <div class="metric-label">Videos</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Student List</h2>
            </div>
            <div class="section-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${studentListHTML || '<tr><td colspan="3">No students found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Tutor List</h2>
            </div>
            <div class="section-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tutorListHTML || '<tr><td colspan="3">No tutors found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Resources List</h2>
            </div>
            <div class="section-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Resource</th>
                            <th>Published By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resourcesListHTML || '<tr><td colspan="3">No resources found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <div class="section-header">
                <h2 class="section-title">Videos List</h2>
            </div>
            <div class="section-content">
                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Video Title</th>
                            <th>Published By</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${videosListHTML || '<tr><td colspan="3">No videos found</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>StudyPro Platform</strong> - Admin Dashboard Report</p>
            <p>Generated on ${currentDate} at ${currentTime}</p>
            <p>This report contains confidential platform analytics. Handle with care.</p>
        </div>
    </body>
    </html>
    `;
  };

  const getInitials = (name, email) => {
    if (name && name !== 'Anonymous') {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'AN';
  };

  const students = users.filter(u => !u.isTutor && !u.isAdmin);
  const tutors = users.filter(u => u.isTutor && !u.isAdmin);

  return (
    <View style={styles.container}>
      {/* Header matching Tutors page */}
      <View style={styles.header}></View>

      {/* Content Card with animation */}
      <Animated.View 
        style={[
          styles.contentCard,
          {
            opacity,
            transform: [{ translateY: scrollY }],
          }
        ]}
      >
        {/* Action Buttons Floating at Top */}
        <View style={styles.actionButtonsWrapper}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.topButton,
                activeButton === 'generate' && styles.activeTopButton,
                isGeneratingReport && styles.disabledBtn
              ]}
              onPress={generateReport}
              disabled={isGeneratingReport}
            >
              <Ionicons
                name={isGeneratingReport ? "sync" : "analytics-outline"}
                size={16}
                color={activeButton === 'generate' ? COLORS.primary : COLORS.textSecondary}
              />
              <Text style={[
                styles.topButtonText, 
                { color: activeButton === 'generate' ? COLORS.primary : COLORS.textSecondary }
              ]}>
                {isGeneratingReport ? "Generating..." : "Generate"}
              </Text>
              {activeButton === 'generate' && <View style={styles.activeUnderline} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.topButton,
                activeButton === 'download' && styles.activeTopButton
              ]}
              onPress={exportReport}
            >
              <Ionicons 
                name="document-outline" 
                size={16} 
                color={activeButton === 'download' ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[
                styles.topButtonText, 
                { color: activeButton === 'download' ? COLORS.primary : COLORS.textSecondary }
              ]}>
                Download
              </Text>
              {activeButton === 'download' && <View style={styles.activeUnderline} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'students' && styles.activeTab]}
            onPress={() => setActiveTab('students')}
          >
            <Text style={[styles.tabText, activeTab === 'students' && styles.activeTabText]}>
              Students
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'tutors' && styles.activeTab]}
            onPress={() => setActiveTab('tutors')}
          >
            <Text style={[styles.tabText, activeTab === 'tutors' && styles.activeTabText]}>
              Tutors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resources' && styles.activeTab]}
            onPress={() => setActiveTab('resources')}
          >
            <Text style={[styles.tabText, activeTab === 'resources' && styles.activeTabText]}>
              Resources
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
            onPress={() => setActiveTab('videos')}
          >
            <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>
              Videos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Report Content */}
        <ScrollView 
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
         {activeTab === 'students' && (
          <View>
            {reportData ? (
              <>
                <SectionHeader 
                  title="Students" 
                  count={students.length} 
                />
                {students && students.length > 0 ? (
                  students.map((student, index) => (
                    <ListCard key={student.id}>
                      <Avatar 
                        initials={getInitials(student.fullName || student.name, student.email)} 
                        color={getRandomColor(index)} 
                      />
                      <View style={styles.listContent}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {student.fullName || student.name || 'Anonymous'}
                        </Text>
                        <Text style={styles.listSubtitle} numberOfLines={1}>
                          {student.email || 'No email'}
                        </Text>
                      </View>
                      <View style={styles.activeIndicator} />
                    </ListCard>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No students found</Text>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="school-outline" size={44} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Report Generated</Text>
                <Text style={styles.emptySubtitle}>
                  Click "Generate" to view students
                </Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'tutors' && (
          <View>
            {reportData ? (
              <>
                <SectionHeader 
                  title="Tutors" 
                  count={tutors.length} 
                />
                {tutors && tutors.length > 0 ? (
                  tutors.map((tutor, index) => (
                    <ListCard key={tutor.id}>
                      <Avatar 
                        initials={getInitials(tutor.fullName || tutor.name, tutor.email)} 
                        color={getRandomColor(index + 3)} 
                      />
                      <View style={styles.listContent}>
                        <Text style={styles.listTitle} numberOfLines={1}>
                          {tutor.fullName || tutor.name || 'Anonymous'}
                        </Text>
                        <Text style={styles.listSubtitle} numberOfLines={1}>
                          {tutor.email || 'No email'}
                        </Text>
                      </View>
                      <View style={styles.tutorBadge}>
                        <Text style={styles.tutorBadgeText}>Tutor</Text>
                      </View>
                    </ListCard>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No tutors found</Text>
                )}
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="person-outline" size={44} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No Report Generated</Text>
                <Text style={styles.emptySubtitle}>
                  Click "Generate" to view tutors
                </Text>
              </View>
            )}
          </View>
        )}


          {activeTab === 'resources' && (
            <View>
              {reportData ? (
                <>
                  <SectionHeader 
                    title="Resources" 
                    count={reportData.resources?.length || 0} 
                  />
                  {reportData.resources && reportData.resources.length > 0 ? (
                    reportData.resources.map((resource, index) => {
                      const publisher = users.find(u => u.id === resource.uploadedBy) || {};
                      const publisherName = publisher.fullName || publisher.name || publisher.email || 'Unknown';
                      return (
                        <ListCard key={resource.id}>
                          <View style={[styles.iconContainer, { backgroundColor: `${getRandomColor(index)}15` }]}>
                            <Ionicons name="book-outline" size={24} color={getRandomColor(index)} />
                          </View>
                          <View style={styles.listContent}>
                            <Text style={styles.listTitle} numberOfLines={1}>
                              {resource.title || resource.fileName || 'Untitled Resource'}
                            </Text>
                            <Text style={styles.listSubtitle}>
                              By {publisherName}
                            </Text>
                          </View>
                        </ListCard>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>No resources found</Text>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-outline" size={44} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No Report Generated</Text>
                  <Text style={styles.emptySubtitle}>
                    Click "Generate" to view resources
                  </Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'videos' && (
            <View>
              {reportData ? (
                <>
                  <SectionHeader 
                    title="Videos" 
                    count={reportData.videos?.length || 0} 
                  />
                  {reportData.videos && reportData.videos.length > 0 ? (
                    reportData.videos.map((video, index) => {
                      const publisher = users.find(u => u.id === video.uploadedBy) || {};
                      const publisherName = publisher.fullName || publisher.name || publisher.email || 'Unknown';
                      return (
                        <ListCard key={video.id}>
                          <View style={[styles.iconContainer, { backgroundColor: `${getRandomColor(index + 2)}15` }]}>
                            <Ionicons name="videocam-outline" size={24} color={getRandomColor(index + 2)} />
                          </View>
                          <View style={styles.listContent}>
                            <Text style={styles.listTitle} numberOfLines={1}>
                              {video.title || 'Untitled Video'}
                            </Text>
                            <Text style={styles.listSubtitle}>
                              By {publisherName}
                            </Text>
                          </View>
                        </ListCard>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>No videos found</Text>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="document-outline" size={44} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyTitle}>No Report Generated</Text>
                  <Text style={styles.emptySubtitle}>
                    Click "Generate" to view videos
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  contentCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    marginTop: -20,
    marginHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -5 },
    elevation: 10,
  },
  actionSection: {
    flexDirection: isMobile ? 'column' : 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 10,
  },
  actionButtonsWrapper: {
    alignItems: "center",
    marginTop: -40,
    marginBottom: 20,
    zIndex: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  topButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "transparent",
    position: "relative",
  },
  activeTopButton: {
    backgroundColor: "transparent",
  },
  topButtonText: {
    fontWeight: "600",
    fontSize: 13,
    marginLeft: 6,
  },
  activeUnderline: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: isMobile ? '47%' : 150,
    backgroundColor: COLORS.bg,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bg,
  },
  tableHeader: {
    backgroundColor: COLORS.bg,
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  headerCell: {
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 6,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginLeft:4,
    marginRight:4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
 
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 2,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  listContent: {
    flex: 1,
    minWidth: 0,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  tutorBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
  },
  tutorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(59, 130, 246, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 130, 246, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textMain,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "500",
  },
});