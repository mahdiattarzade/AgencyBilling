import { Text, View, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { CreateTables } from '@/app/database/init'
import moment from "moment-jalaali";
import 'moment/locale/fa';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FetchData } from '@/app/database/services/get-data';
import ActionButton from '@/app/components/buttons';
import { FilterByType } from '@/app/components/buttons';
import 'moment/locale/fa';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'


// فعال کردن RTL
I18nManager.forceRTL(true);

export default function Index() {
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'invoice' | 'preinvoice'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'awaiting_confirmation' | 'awaiting_payment' | 'cancelled'>('all');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [dbInit, setDbInit] = useState(false)

  const initApp = async () => {
    try {

      await CreateTables();

      loadDatas();
    }
    catch (err: any) {
      Alert.alert('خطا', 'خطا در دریافت اطلاعات فاکتور');
    }
    finally {
      setDbInit(true)
    }

  };

  // Initialize moment
  useEffect(() => {
    moment.loadPersian({ usePersianDigits: true });
    moment.loadPersian({ usePersianDigits: true });
    initApp();

  }, []);

  const loadDatas = async () => {

    try {

      const datas = await FetchData('documents.status IN (?, ?)', ['awaiting_confirmation', 'awaiting_payment']);

      setData(datas);

    } catch (err: any) {
      Alert.alert('خطا', err.message);
    }

  };
  async function goToDetail() {
    router.push('/detail-page/detail')
  }

  async function onRefresh() {
    setRefreshing(true);
    // await loadDatas();

    setTimeout(() => setRefreshing(false), 100);
  }

  const handleActionPress = (action: string) => {
    setSelectedAction(action);
    // Navigate based on action
    switch (action) {
      case 'photography':
        router.push({ pathname: 'screens/AddInvoice', params: { action: 'photography' } });
        break;
      case 'panel_making':
        router.push({ pathname: 'screens/AddInvoice', params: { action: 'panel_making' } });
        break;
      case 'printing':
        router.push({ pathname: 'screens/AddInvoice', params: { action: 'printing' } });
        break;
    }
  };

  // Filter data based on selected filters
  const filteredData = data.filter(item => {
    // Filter by type
    if (selectedType === 'invoice' && item.document_type !== 'invoice') return false;
    if (selectedType === 'preinvoice' && item.document_type !== 'preinvoice') return false;

    // Filter by status
    if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;

    return true;
  });

  // آمار
  const invoiceCount = data.filter(item => item.document_type === 'invoice').length;
  const preinvoiceCount = data.filter(item => item.document_type === 'preinvoice').length;
  const pendingCount = data.filter(item => item.status === 'awaiting_confirmation').length;
  const paidCount = data.filter(item => item.status === 'awaiting_payment').length;
  const cancelledCount = data.filter(item => item.status === 'cancelled').length;
  const totalCount = data.length;
  const filteredCount = filteredData.length;

  const getTypeLabel = () => {
    switch (selectedType) {
      case 'invoice': return 'فاکتور';
      case 'preinvoice': return 'پیش فاکتور';
      default: return 'همه';
    }
  };

  const getStatusLabel = () => {
    switch (selectedStatus) {
      case 'awaiting_confirmation': return 'در انتظار تایید';
      case 'awaiting_payment': return 'در انتظار پرداخت';
      case 'cancelled': return 'لغو شده';
      default: return 'همه';
    }
  };

  if (!dbInit) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>در حال دریافت اطلاعات...</Text>
      </SafeAreaView>
    )
  }

  return (

    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.brandTitle}>Toop_Aks</Text>
          <Text style={styles.brandSubtitle}>مدیریت فاکتورها</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Filter Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>فیلتر بر اساس نوع</Text>
          <View style={styles.filterContainer}>
            <FilterByType
              type='همه'
              isActive={selectedType === 'all'}
              iconeName='list'
              onPress={() => setSelectedType('all')}
            ></FilterByType>

            <FilterByType
              type='فاکتورها'
              isActive={selectedType === "invoice"}
              iconeName='document'
              onPress={() => setSelectedType('invoice')}
            ></FilterByType>

            <FilterByType
              type='پیش فاکتورها'
              isActive={selectedType === 'preinvoice'}
              iconeName='document-text-outline'
              onPress={() => setSelectedType('preinvoice')}
            ></FilterByType>
          </View>
        </View>

        {/* Status Filter Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>فیلتر بر اساس وضعیت</Text>
          <View style={styles.statusFilterButtons}>
            <TouchableOpacity
              style={[
                styles.statusFilterButton,
                selectedStatus === 'all' && styles.statusFilterButtonActive
              ]}
              onPress={() => setSelectedStatus('all')}
            >
              <Text style={[
                styles.statusFilterButtonText,
                selectedStatus === 'all' && styles.statusFilterButtonTextActive
              ]}>
                همه
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusFilterButton,
                styles.pendingFilterButton,
                selectedStatus === 'awaiting_confirmation' && styles.statusFilterButtonActive
              ]}
              onPress={() => setSelectedStatus('awaiting_confirmation')}
            >
              <Ionicons name="time" size={14} color={selectedStatus === 'awaiting_confirmation' ? '#fff' : '#f59e0b'} />
              <Text style={[
                styles.statusFilterButtonText,
                selectedStatus === 'awaiting_confirmation' && styles.statusFilterButtonTextActive
              ]}>
                در انتظار تایید
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusFilterButton,
                styles.paidFilterButton,
                selectedStatus === 'awaiting_payment' && styles.statusFilterButtonActive
              ]}
              onPress={() => setSelectedStatus('awaiting_payment')}
            >
              <Ionicons name="checkmark-circle" size={14} color={selectedStatus === 'awaiting_payment' ? '#fff' : '#10b981'} />
              <Text style={[
                styles.statusFilterButtonText,
                selectedStatus === 'awaiting_payment' && styles.statusFilterButtonTextActive
              ]}>
                در انتظار پرداخت
              </Text>
            </TouchableOpacity>


          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>آمار فاکتورها</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="document-text" size={24} color="#FF6B6B" />
              </View>
              <Text style={styles.statNumber}>{totalCount}</Text>
              <Text style={styles.statLabel}>کل موارد</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="receipt" size={24} color="#4f46e5" />
              </View>
              <Text style={styles.statNumber}>{invoiceCount}</Text>
              <Text style={styles.statLabel}>فاکتور</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="document-text-outline" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.statNumber}>{preinvoiceCount}</Text>
              <Text style={styles.statLabel}>پیش فاکتور</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="filter" size={24} color="#10b981" />
              </View>
              <Text style={styles.statNumber}>{filteredCount}</Text>
              <Text style={styles.statLabel}>فیلتر شده</Text>
            </View>
          </View>
        </View>

        {/* Selected Filters Info */}
        <View style={styles.selectedFilters}>
          <Text style={styles.selectedFiltersTitle}>فیلترهای انتخاب شده:</Text>
          <View style={styles.selectedFiltersBadges}>
            <View style={styles.selectedFilterBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.selectedFilterText}>نوع: {getTypeLabel()}</Text>
            </View>
            <View style={styles.selectedFilterBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10b981" />
              <Text style={styles.selectedFilterText}>وضعیت: {getStatusLabel()}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>عملیات سریع</Text>
          <View style={styles.actionsRow}>
            <ActionButton
              type='photography'
              label='عکاسی'
              iconeName='camera'
              onPress={() => handleActionPress('photography')}></ActionButton>
            <ActionButton
              type='panel_making'
              label="تابلو سازی"
              iconeName='grid'
              onPress={() => handleActionPress('panel_making')}></ActionButton>
            <ActionButton
              type='printing'
              label='چاپ'
              iconeName='print'
              onPress={() => handleActionPress('printing')}></ActionButton>

          </View>
        </View>

        {/* Show Table Button */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={[
              styles.showTableButton,
              filteredCount === 0 && styles.showTableButtonDisabled
            ]}
            onPress={() => setShowTableModal(true)}
            disabled={filteredCount === 0}
          >
            <Ionicons size={24} color="#fff" />
            <View style={styles.buttonContent}>
              <Text style={styles.showTableButtonText}>نمایش جدول</Text>
              <Text style={styles.showTableButtonSubtext}>
                {filteredCount} مورد یافت شد
              </Text>
            </View>
          </TouchableOpacity>

          {filteredCount === 0 && (
            <Text style={styles.noDataText}>
              هیچ موردی با فیلترهای انتخاب شده یافت نشد
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Table Modal (Pop-up) */}
      <Modal
        visible={showTableModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <TableModal
          data={filteredData}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onClose={() => setShowTableModal(false)}
        />
      </Modal>
    </SafeAreaView >
  );
}

// Component for Table Modal
function TableModal({ data, selectedType, selectedStatus, onClose }: any) {
  return (
    <SafeAreaView style={modalStyles.container}>
      {/* Modal Header */}
      <View style={modalStyles.header}>
        <TouchableOpacity
          style={modalStyles.backButton}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={modalStyles.headerContent}>
          <Text style={modalStyles.headerTitle}>جدول فاکتورها</Text>
          <Text style={modalStyles.headerSubtitle}>
            {data.length} مورد
          </Text>
        </View>
      </View>

      {/* Horizontal Scroll Container */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={modalStyles.horizontalScrollContainer}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={modalStyles.tableWrapper}>
          {/* Table Header - RTL */}
          <View style={modalStyles.tableHeader}>
            <View style={[modalStyles.headerCell, modalStyles.cellAction]}>
              <Text style={modalStyles.headerCellText}>عملیات</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellDate]}>
              <Text style={modalStyles.headerCellText}>تاریخ ایجاد</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellCustomer]}>
              <Text style={modalStyles.headerCellText}>مشتری</Text>
            </View>

            <View style={[modalStyles.headerCell, modalStyles.cellNumber]}>
              <Text style={modalStyles.headerCellText}>شماره</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellStatus]}>
              <Text style={modalStyles.headerCellText}>وضعیت</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellMode]}>
              <Text style={modalStyles.headerCellText}>حالت</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellType]}>
              <Text style={modalStyles.headerCellText}>نوع</Text>
            </View>
            <View style={[modalStyles.headerCell, modalStyles.cellRowNum]}>
              <Text style={modalStyles.headerCellText}>ردیف</Text>
            </View>

          </View>

          {/* Table Body */}
          <ScrollView
            style={modalStyles.tableBody}
            showsVerticalScrollIndicator={true}
          >
            {data.map((item: any, index: number) => (
              <View key={item.id} style={modalStyles.tableRow}>

                {/* Action - ADDED EDIT BUTTON */}
                <View style={[modalStyles.cell, modalStyles.cellAction]}>
                  <View style={modalStyles.actionButtons}>
                    <TouchableOpacity
                      style={[modalStyles.actionButton, modalStyles.viewButton]}
                      onPress={() => router.push({ pathname: '/detail-page/detail', params: { id: item.id } })}
                    >
                      <Ionicons name="eye-outline" size={13} color="#fff" />
                      <Text style={modalStyles.actionButtonText}>ویرایش</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[modalStyles.actionButton, modalStyles.editButton]}
                      onPress={() => router.push({ pathname: '/invoice-view', params: { id: item.id, mode: 'edit' } })}
                    >
                      <Ionicons name="create-outline" size={13} color="#fff" />
                      <Text style={modalStyles.actionButtonText}>مشاهده</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date - FIXED: using item.created_at from database */}
                <View style={[modalStyles.cell, modalStyles.cellDate]}>
                  <Text style={modalStyles.dateText} numberOfLines={2}>
                    {item.created_at}
                  </Text>
                </View>

                {/* Customer */}
                <View style={[modalStyles.cell, modalStyles.cellCustomer]}>
                  <Text style={[modalStyles.customerText]} numberOfLines={2}>
                    {item.full_name}
                  </Text>
                </View>

                {/* Number */}
                <View style={[modalStyles.cell, modalStyles.cellNumber]}>
                  <Text style={modalStyles.numberText} numberOfLines={1}>
                    {item.invoice_number}
                  </Text>
                </View>


                {/* Status */}
                <View style={[modalStyles.cell, modalStyles.cellStatus]}>
                  <View style={[
                    modalStyles.statusBadge,
                    item.status === 'awaiting_payment' ? modalStyles.paidStatusBadge :
                      item.status === 'cancelled' ? modalStyles.cancelledStatusBadge :
                        modalStyles.pendingStatusBadge
                  ]}>
                    <View style={[
                      modalStyles.statusDot,
                      item.status === 'awaiting_payment' ? modalStyles.paidStatusDot :
                        item.status === 'cancelled' ? modalStyles.cancelledStatusDot :
                          modalStyles.pendingStatusDot
                    ]} />
                    <Text style={modalStyles.statusText}>
                      {item.status === 'awaiting_payment' ? 'در انتظار پرداخت' :
                        item.status === 'awaiting_confirmation' ? 'در انتظار تایید' : 'لغو شده'}
                    </Text>
                  </View>
                </View>

                {/* Mode */}
                <View style={[modalStyles.cell, modalStyles.cellMode]}>
                  <View style={[
                    modalStyles.modeBadge,
                    item.mode === 'photography' ? modalStyles.photographyBadge :
                      item.mode === 'panel_making' ? modalStyles.planningBadge :
                        modalStyles.printingBadge
                  ]}>
                    <Text style={modalStyles.modeText}>
                      {item.mode === 'photography' ? 'عکاسی' :
                        item.mode === 'panel_making' ? 'تابلو سازی' : 'چاپ'}
                    </Text>
                  </View>
                </View>

                {/* Type */}
                <View style={[modalStyles.cell, modalStyles.cellType]}>
                  <View style={[
                    modalStyles.typeBadge,
                    item.document_type === 'invoice' ? modalStyles.invoiceBadge : modalStyles.preInvoiceBadge
                  ]}>
                    <Text style={modalStyles.badgeText}>
                      {item.document_type === 'invoice' ? 'فاکتور' : 'پیش فاکتور'}
                    </Text>
                  </View>
                </View>

                {/* Row Number */}
                <View style={[modalStyles.cell, modalStyles.cellRowNum]}>
                  <Text style={modalStyles.cellText}>{index + 1}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerContent: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF6B6B',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },

  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  scrollContent: {
    flex: 1,
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,

  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },

  statusFilterButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 6,
    minWidth: 100,
  },
  statusFilterButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  pendingFilterButton: {
    borderColor: '#f59e0b',
  },
  paidFilterButton: {
    borderColor: '#10b981',
  },
  cancelledFilterButton: {
    borderColor: '#ef4444',
  },
  statusFilterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
  },
  statusFilterButtonTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  selectedFilters: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFiltersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,

  },
  selectedFiltersBadges: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  selectedFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  selectedFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065f46',
  },
  quickActions: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },


  footerSection: {
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 40,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  showTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 16,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  showTableButtonDisabled: {
    backgroundColor: '#cbd5e1',
    shadowColor: '#cbd5e1',
  },
  buttonContent: {
    flex: 1,
  },
  showTableButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  showTableButtonSubtext: {
    fontSize: 14,
    color: '#ffe4e6',
    marginTop: 2,
  },
  noDataText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 12,
  },
  // Original table styles
  tableRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    minHeight: 64,
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  idCell: { flex: 0.5 },
  typeCell: { flex: 0.8 },
  modeCell: { flex: 1 },
  statusCell: { flex: 1 },
  numberCell: { flex: 1.2 },
  customerCell: { flex: 1.2 },
  dateCell: { flex: 1 },
  actionCell: { flex: 1.5 },
  cellText: {
    fontSize: 13,
    color: '#334155',
  },
  numberText: {
    fontFamily: 'monospace',
    fontWeight: '500',
  },
  customerText: {
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 80,
  },
  invoiceBadge: {
    backgroundColor: '#4f46e5',
  },
  preInvoiceBadge: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  modeIcon: {
    marginRight: 2,
  },
  photographyMode: {
    backgroundColor: '#7c3aed',
  },
  planningMode: {
    backgroundColor: '#0ea5e9',
  },
  printingMode: {
    backgroundColor: '#10b981',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  paidBadge: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  pendingBadge: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  cancelledBadge: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  paidDot: {
    backgroundColor: '#10b981',
  },
  pendingDot: {
    backgroundColor: '#f59e0b',
  },
  cancelledDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
  },
  // ADDED: Action buttons container
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  viewButton: {
    backgroundColor: '#FF6B6B',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e55e5e',
  },



  backButton: {
    marginRight: 16,

  },
  headerContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',

  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffe4e6',
    marginTop: 4,

  },
  horizontalScrollContainer: {
    flex: 1,
  },
  tableWrapper: {
    minWidth: 800,
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 14,
    minHeight: 50,
  },
  headerCell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#334155',
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  tableBody: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
  },
  cellRowNum: {
    width: 60,
    minWidth: 60,
    maxWidth: 60,
  },
  cellType: {
    width: 90,
    minWidth: 90,
    maxWidth: 90,
  },
  cellMode: {
    width: 90,
    minWidth: 90,
    maxWidth: 90,
  },
  cellStatus: {
    width: 100,
    minWidth: 100,
    maxWidth: 100,
  },
  cellNumber: {
    width: 120,
    minWidth: 120,
    maxWidth: 120,
  },
  cellCustomer: {
    width: 150,
    minWidth: 150,
    maxWidth: 150,
  },
  cellDate: {
    width: 100,
    minWidth: 100,
    maxWidth: 100,
  },
  cellAction: {
    width: 140,
    minWidth: 140,
    maxWidth: 140,
    borderLeftWidth: 0,
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
  },
  numberText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  customerText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 18,
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    width: '100%',
  },
  invoiceBadge: {
    backgroundColor: '#4f46e5',
  },
  preInvoiceBadge: {
    backgroundColor: '#f59e0b',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    width: '100%',
  },
  photographyBadge: {
    backgroundColor: '#7c3aed',
  },
  planningBadge: {
    backgroundColor: '#0ea5e9',
  },
  printingBadge: {
    backgroundColor: '#10b981',
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    width: '100%',
  },
  pendingStatusBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  paidStatusBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  cancelledStatusBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pendingStatusDot: {
    backgroundColor: '#f59e0b',
  },
  paidStatusDot: {
    backgroundColor: '#10b981',
  },
  cancelledStatusDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center',
  },
  // ADDED: Action buttons container for modal
  actionButtons: {
    flexDirection: 'row-reverse',
    gap: 6,
    width: '100%',
  },
  actionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#FF6B6B',
  },
  editButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});