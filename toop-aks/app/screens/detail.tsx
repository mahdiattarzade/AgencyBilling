import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import moment from 'moment-jalaali';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { FetchDocument } from '@/app/database/services/get-data';
import {
  UpdatePreInvoiceToInvoice,
  RejectPreInvoice,
  UpdateDocument,
  UpdateInvoiceServices,
  updatePaidAmount
} from '@/app/database/services/update-data';

export default function EditInvoice() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = Number(params.id);

  const [invoiceData, setInvoiceData] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [originalServices, setOriginalServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [savingServices, setSavingServices] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<{
    status: string;
    text: string;
    color: string;
    action: 'confirm' | 'reject' | 'pay';
  } | null>(null);

  const [serviceForm, setServiceForm] = useState({
    name: '',
    amount: '',
    unitPrice: '',
    description: ''
  });

  // تابع تبدیل اعداد انگلیسی به فارسی
  const toPersianNumber = (num: string | number): string => {
    if (num === undefined || num === null) return '';
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return num.toString().replace(/[0-9]/g, (match) => persianDigits[parseInt(match)]);
  };

  // تابع فرمت‌کننده قیمت با جداکننده هزارگان (برای نمایش)
  const formatPriceDisplay = (value: string | number): string => {
    if (!value && value !== 0) return '';

    // حذف کاماهای قبلی
    const numStr = value.toString().replace(/,/g, '');
    if (numStr === '' || isNaN(Number(numStr))) return '';

    const number = Number(numStr);

    // فرمت با جداکننده هزارگان و تبدیل به فارسی
    return toPersianNumber(number.toLocaleString('en-US'));
  };

  // تابع فرمت‌کننده قیمت برای ورودی (انگلیسی با کاما)
  const formatPriceInput = (text: string): string => {
    if (!text) return '';

    // حذف همه کاراکترهای غیرعددی (فقط اعداد 0-9 مجاز)
    const rawNumber = text.replace(/[^0-9]/g, '');
    if (rawNumber === '') return '';

    // اضافه کردن کاما به اعداد انگلیسی
    return Number(rawNumber).toLocaleString('en-US');
  };

  // تابع دریافت عدد خام از ورودی
  const getRawNumber = (formattedText: string): string => {
    if (!formattedText) return '';
    // حذف کاماها و برگرداندن عدد خام
    return formattedText.replace(/,/g, '');
  };

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await FetchDocument(id);
      setInvoiceData(data.invoice);
      const servicesList = data.services || [];
      setServices(servicesList);
      setOriginalServices([...servicesList]);
    } catch (err: any) {
      Alert.alert('خطا', 'خطا در دریافت اطلاعات فاکتور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    moment.loadPersian({ usePersianDigits: true });
    loadInvoice();
  }, []);

  const hasServicesChanged = () => {
    if (services.length !== originalServices.length) return true;
    for (let i = 0; i < services.length; i++) {
      const current = services[i];
      const original = originalServices[i];
      if (
        (current.service || current.name) !== (original.service || original.name) ||
        Number(current.amount) !== Number(original.amount) ||
        Number(current.unit_price || current.unitPrice) !== Number(original.unit_price || original.unitPrice) ||
        current.description !== original.description
      ) {
        return true;
      }
    }
    return false;
  };

  const handleServiceEdit = (index: number) => {
    const service = services[index];
    setServiceForm({
      name: service.service || service.name || '',
      amount: service.amount?.toString() || '',
      unitPrice: (service.unit_price || service.unitPrice || 0).toString(),
      description: service.description || '',
    });
    setEditingServiceIndex(index);
    setShowServiceModal(true);
  };

  const handleServiceSave = async () => {
    if (!serviceForm.name.trim()) {
      Alert.alert('خطا', 'لطفا نام سرویس را وارد کنید');
      return;
    }

    const rawAmount = getRawNumber(serviceForm.amount);
    const rawUnitPrice = getRawNumber(serviceForm.unitPrice);

    if (!rawAmount || isNaN(Number(rawAmount)) || Number(rawAmount) <= 0) {
      Alert.alert('خطا', 'لطفا تعداد صحیح وارد کنید');
      return;
    }
    if (!rawUnitPrice || isNaN(Number(rawUnitPrice)) || Number(rawUnitPrice) <= 0) {
      Alert.alert('خطا', 'لطفا قیمت واحد صحیح وارد کنید');
      return;
    }

    try {
      const serviceData = {
        service: serviceForm.name,
        amount: Number(rawAmount),
        unit_price: Number(rawUnitPrice),
        description: serviceForm.description
      };

      if (editingServiceIndex !== null) {
        const updatedServices = [...services];
        updatedServices[editingServiceIndex] = {
          ...updatedServices[editingServiceIndex],
          ...serviceData
        };
        setServices(updatedServices);
        Alert.alert('موفقیت', 'سرویس ویرایش شد');
      } else {
        const newService = {
          id: `temp-${Date.now()}`,
          document_id: id,
          ...serviceData,
          created_at: new Date().toISOString()
        };
        setServices([...services, newService]);
        Alert.alert('موفقیت', 'سرویس اضافه شد');
      }

      setShowServiceModal(false);
      setEditingServiceIndex(null);
      resetServiceForm();
    } catch (error) {
      Alert.alert('خطا', 'خطا در ذخیره موقت سرویس');
    }
  };

  const confirmPaidAmount = () => {
    const rawPaidAmount = getRawNumber(invoiceData.paid_amount?.toString() || '');

    if (!rawPaidAmount || Number(rawPaidAmount) <= 0) {
      Alert.alert('خطا', 'لطفا مبلغ پرداختی معتبر وارد کنید');
      return;
    }

    Alert.alert(
      'تایید مبلغ پرداختی',
      `آیا از ثبت مبلغ ${formatPriceDisplay(rawPaidAmount)} تومان به عنوان پرداختی اطمینان دارید؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'تایید و ثبت',
          onPress: async () => {
            try {
              setUpdating(true);
              const paid_amount = Number(rawPaidAmount);
              await updatePaidAmount(id, paid_amount);
              Alert.alert('✅ موفقیت', 'مبلغ پرداختی با موفقیت ثبت شد');
              await loadInvoice();
            } catch (err) {
              Alert.alert('خطا', 'مشکلی در ثبت مبلغ پرداختی پیش آمد');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const handleServiceDelete = (index: number) => {
    Alert.alert(
      'حذف سرویس',
      'آیا مطمئن هستید که می‌خواهید این سرویس را حذف کنید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const updatedServices = services.filter((_, i) => i !== index);
            setServices(updatedServices);
          }
        }
      ]
    );
  };

  const resetServiceForm = () => {
    setServiceForm({
      name: '',
      amount: '',
      unitPrice: '',
      description: ''
    });
  };

  const handleAddService = () => {
    resetServiceForm();
    setEditingServiceIndex(null);
    setShowServiceModal(true);
  };

  const handleSaveAllServices = async () => {
    if (services.length === 0) {
      Alert.alert('خطا', 'حداقل یک سرویس باید وجود داشته باشد');
      return;
    }

    const invalidServices = services.filter(service =>
      !(service.service || service.name)?.trim() ||
      !service.amount ||
      service.amount <= 0 ||
      !(service.unit_price || service.unitPrice) ||
      (service.unit_price || service.unitPrice) <= 0
    );

    if (invalidServices.length > 0) {
      Alert.alert('خطا', 'لطفا اطلاعات همه سرویس‌ها را کامل و صحیح وارد کنید');
      return;
    }

    if (!hasServicesChanged()) {
      Alert.alert('توجه', 'تغییری در سرویس‌ها ایجاد نشده است');
      return;
    }

    Alert.alert(
      'ذخیره تغییرات',
      'آیا مطمئن هستید که می‌خواهید تغییرات سرویس‌ها را ذخیره کنید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'ذخیره',
          onPress: async () => {
            try {
              setSavingServices(true);
              const servicesToSave = services.map(service => ({
                id: service.id?.toString().startsWith('temp-') ? null : service.id,
                service: service.service || service.name,
                amount: Number(service.amount),
                unit_price: Number(service.unit_price || service.unitPrice),
                description: service.description || ''
              }));
              await UpdateInvoiceServices(id, servicesToSave);
              setOriginalServices([...services]);
              Alert.alert('✅ موفقیت', 'تمام سرویس‌ها با موفقیت ذخیره شدند');
              await loadInvoice();
            } catch (error: any) {
              Alert.alert('❌ خطا', error.message || 'خطا در ذخیره سرویس‌ها');
            } finally {
              setSavingServices(false);
            }
          }
        }
      ]
    );
  };

  const handleStatusChange = (action: 'confirm' | 'reject' | 'pay') => {
    if (hasServicesChanged()) {
      Alert.alert(
        'تغییرات ذخیره نشده',
        'برای تغییر وضعیت ابتدا باید تغییرات سرویس‌ها را ذخیره کنید. آیا می‌خواهید ادامه دهید؟',
        [
          { text: 'انصراف', style: 'cancel' },
          {
            text: 'ادامه',
            onPress: () => {
              setSelectedStatus(getStatusConfig(action));
              setShowStatusModal(true);
            }
          }
        ]
      );
    } else {
      setSelectedStatus(getStatusConfig(action));
      setShowStatusModal(true);
    }
  };

  const getStatusConfig = (action: 'confirm' | 'reject' | 'pay') => {
    if (action === 'confirm') {
      return {
        status: 'awaiting_payment',
        text: 'تایید و تبدیل به فاکتور',
        color: '#22c55e',
        action: 'confirm'
      };
    } else if (action === 'reject') {
      return {
        status: 'rejected',
        text: 'رد شده',
        color: '#dc2626',
        action: 'reject'
      };
    } else {
      return {
        status: 'paid',
        text: 'پرداخت شده',
        color: '#10b981',
        action: 'pay'
      };
    }
  };

  const confirmStatusChange = async () => {
    if (!selectedStatus) return;

    try {
      setUpdating(true);

      if (selectedStatus.action === 'confirm') {
        await UpdatePreInvoiceToInvoice(id);
        Alert.alert('✅ موفقیت', 'پیش‌فاکتور با موفقیت تایید و به فاکتور تبدیل شد');
        router.replace('/');
      } else if (selectedStatus.action === 'reject') {
        await RejectPreInvoice(id);
        Alert.alert('✅ موفقیت', 'پیش‌فاکتور با موفقیت رد شد');
        router.replace('/');
      } else if (selectedStatus.action === 'pay') {
        await UpdateDocument(id, 'paid');
        Alert.alert('✅ موفقیت', 'فاکتور با موفقیت پرداخت شده');
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('❌ خطا', error.message || 'خطا در به‌روزرسانی وضعیت');
    } finally {
      setUpdating(false);
      setShowStatusModal(false);
      setSelectedStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'confirmed': return '#10b981';
      case 'awaiting_confirmation': return '#f59e0b';
      case 'awaiting_payment': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'پرداخت شده';
      case 'rejected': return 'رد شده';
      case 'confirmed': return 'تایید شده';
      case 'awaiting_confirmation': return 'در انتظار تایید';
      case 'awaiting_payment': return 'در انتظار پرداخت';
      default: return status;
    }
  };

  const getTypeText = (document_type: string) => {
    return document_type === 'invoice' ? 'فاکتور' : 'پیش فاکتور';
  };

  const getTypeColor = (document_type: string) => {
    return document_type === 'invoice' ? '#4f46e5' : '#f59e0b';
  };

  const calculateTotal = () => {
    return services.reduce((sum, service) => {
      const unitPrice = service.unit_price || service.unitPrice || 0;
      const amount = service.amount || 0;
      return sum + (amount * unitPrice);
    }, 0);
  };

  if (loading && !invoiceData) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>در حال دریافت اطلاعات...</Text>
      </SafeAreaView>
    );
  }

  if (!invoiceData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>فاکتور یافت نشد</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
          <Text style={styles.backButtonText}>بازگشت به صفحه اصلی</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalAmount = calculateTotal();
  const isInvoice = invoiceData.document_type === 'invoice';
  const currentStatus = invoiceData.status || 'awaiting_confirmation';
  const hasChanges = hasServicesChanged();

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#FF6B6B', '#FF8F8F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>{getTypeText(invoiceData.document_type)}</Text>
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(invoiceData.document_type) }]}>
              <Text style={styles.typeBadgeText}>{getTypeText(invoiceData.document_type)}</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>شماره: {invoiceData.invoice_number}</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="information-circle" size={22} color="#FF6B6B" />
            </View>
            <Text style={styles.cardTitle}>اطلاعات اصلی</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>شماره فاکتور:</Text>
              <Text style={styles.infoValue}>{invoiceData.invoice_number}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>نام مشتری:</Text>
              <Text style={styles.infoValue}>{invoiceData.full_name || 'نامشخص'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>تاریخ ایجاد:</Text>
              <Text style={styles.infoValue}>{invoiceData.created_at}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>وضعیت فعلی:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentStatus) }]}>
                <Text style={styles.statusBadgeText}>{getStatusText(currentStatus)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Paid Amount Section */}
        <View style={styles.paidAmountSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="cash-outline" size={20} color="#FF6B6B" />
              </View>
              <Text style={styles.sectionTitle}>مبلغ پرداختی</Text>
            </View>
            {Number(getRawNumber(invoiceData.paid_amount?.toString() || '')) > 0 && (
              <View style={styles.paidStatusBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.paidStatusText}>پرداخت ثبت شده</Text>
              </View>
            )}
          </View>

          <View style={styles.paidAmountCard}>
            <View style={styles.paidAmountInputContainer}>
              <TextInput
                style={styles.paidAmountInput}
                value={formatPriceInput(invoiceData.paid_amount?.toString() || '')}
                onChangeText={(text) => {
                  const rawNumber = getRawNumber(text);
                  setInvoiceData({ ...invoiceData, paid_amount: rawNumber });
                }}
                keyboardType="numeric"
                textAlign="right"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.paidAmountCurrency}>
                <Text style={styles.currencyText}>تومان</Text>
              </View>
            </View>

            {Number(getRawNumber(invoiceData.paid_amount?.toString() || '')) > 0 && (
              <View style={styles.paidAmountPreview}>
                <View style={styles.previewRow}>
                  <Ionicons name="wallet-outline" size={16} color="#10b981" />
                  <Text style={styles.previewLabel}>مبلغ واریزی:</Text>
                </View>
                <Text style={styles.previewValue}>
                  {formatPriceDisplay(invoiceData.paid_amount)} تومان
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.confirmPaidButton,
                (!invoiceData.paid_amount || updating) && styles.confirmPaidButtonDisabled
              ]}
              onPress={confirmPaidAmount}
              activeOpacity={0.8}
              disabled={!invoiceData.paid_amount || updating}
            >
              <LinearGradient
                colors={!invoiceData.paid_amount ? ['#cbd5e1', '#94a3b8'] : ['#3b82f6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmPaidGradient}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                    <Text style={styles.confirmPaidButtonText}>تایید و ثبت پرداخت</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.card}>
          <View style={[styles.cardHeader, styles.servicesHeader]}>
            <View style={styles.servicesTitleContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="list" size={22} color="#FF6B6B" />
              </View>
              <Text style={styles.cardTitle}>سرویس‌ها ({services.length})</Text>
            </View>
            <TouchableOpacity style={styles.addServiceButton} onPress={handleAddService} disabled={savingServices}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addServiceText}>افزودن سرویس</Text>
            </TouchableOpacity>
          </View>

          {hasChanges && (
            <View style={styles.changesNotification}>
              <Ionicons name="information-circle" size={18} color="#f59e0b" />
              <Text style={styles.changesNotificationText}>تغییرات ذخیره نشده وجود دارد</Text>
            </View>
          )}

          <View style={styles.servicesTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>نام سرویس</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>تعداد</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>قیمت واحد</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>جمع</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.9 }]}>عملیات</Text>
            </View>

            {services.length === 0 ? (
              <View style={styles.emptyServices}>
                <Ionicons name="list" size={48} color="#cbd5e1" />
                <Text style={styles.emptyServicesText}>سرویسی وجود ندارد</Text>
              </View>
            ) : (
              services.map((service, index) => {
                const unitPrice = service.unit_price || service.unitPrice || 0;
                const amount = service.amount || 0;
                const total = amount * unitPrice;

                return (
                  <View key={service.id || index} style={styles.tableRow}>
                    <View style={[styles.tableCell, { flex: 2 }]}>
                      <Text style={styles.serviceName}>{service.service || service.name}</Text>
                      {service.description && (
                        <Text style={styles.serviceDescription}>{service.description}</Text>
                      )}
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={styles.cellText}>{amount.toLocaleString('fa-IR')}</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={styles.cellText}>{unitPrice.toLocaleString('fa-IR')} تومان</Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1 }]}>
                      <Text style={[styles.cellText, styles.totalCell]}>
                        {total.toLocaleString('fa-IR')} تومان
                      </Text>
                    </View>
                    <View style={[styles.tableCell, { flex: 1.9 }]}>
                      <View style={styles.serviceActions}>
                        <TouchableOpacity
                          style={styles.editServiceButton}
                          onPress={() => handleServiceEdit(index)}
                          disabled={savingServices}
                        >
                          <Ionicons name="create" size={16} color="#0ea5e9" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.deleteServiceButton}
                          onPress={() => handleServiceDelete(index)}
                          disabled={savingServices}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>جمع کل:</Text>
            <Text style={styles.totalAmount}>{totalAmount.toLocaleString('fa-IR')} تومان</Text>
          </View>

          <TouchableOpacity
            style={[styles.saveAllButton, (!hasChanges || savingServices) && styles.saveAllButtonDisabled]}
            onPress={handleSaveAllServices}
            disabled={savingServices || !hasChanges}
          >
            {savingServices ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save" size={18} color="#fff" />
                <Text style={styles.saveAllButtonText}>
                  {hasChanges ? 'ذخیره تغییرات سرویس‌ها' : 'تغییری وجود ندارد'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Change Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="sync" size={22} color="#FF6B6B" />
            </View>
            <Text style={styles.cardTitle}>تغییر وضعیت</Text>
          </View>

          <View style={styles.statusSection}>
            {isInvoice ? (
              <TouchableOpacity
                style={[styles.statusChangeButton, { backgroundColor: currentStatus === 'paid' ? '#10b981' : '#3b82f6' }]}
                onPress={() => handleStatusChange('pay')}
                disabled={currentStatus === 'paid' || updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name={currentStatus === 'paid' ? 'checkmark-circle' : 'card'} size={20} color="#fff" />
                    <Text style={styles.statusChangeButtonText}>
                      {currentStatus === 'paid' ? 'پرداخت شده' : 'علامت‌گذاری به عنوان پرداخت شده'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.preInvoiceButtons}>
                <TouchableOpacity
                  style={[styles.statusChangeButton, styles.confirmButton, { backgroundColor: '#22c55e' }]}
                  onPress={() => handleStatusChange('confirm')}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.statusChangeButtonText}>تایید و تبدیل به فاکتور</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusChangeButton, styles.rejectButton, { backgroundColor: '#dc2626' }]}
                  onPress={() => handleStatusChange('reject')}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="close" size={20} color="#fff" />
                      <Text style={styles.statusChangeButtonText}>رد کردن</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Status Change Modal */}
      <Modal visible={showStatusModal} transparent animationType="fade" onRequestClose={() => !updating && setShowStatusModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name={selectedStatus?.action === 'reject' ? 'close-circle' : 'checkmark-circle'} size={32} color={selectedStatus?.color || '#10b981'} />
              <Text style={styles.modalTitle}>تغییر وضعیت</Text>
            </View>

            <Text style={styles.modalText}>
              {selectedStatus?.action === 'confirm'
                ? 'آیا مطمئن هستید که می‌خواهید این پیش‌فاکتور را تایید و به فاکتور تبدیل کنید؟'
                : selectedStatus?.action === 'reject'
                  ? 'آیا مطمئن هستید که می‌خواهید این پیش‌فاکتور را رد کنید؟'
                  : 'آیا مطمئن هستید که می‌خواهید این فاکتور را پرداخت شده علامت‌گذاری کنید؟'}
            </Text>

            <View style={styles.modalInfo}>
              <View style={styles.modalInfoRow}>
                <Ionicons name="document-text" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  شماره: <Text style={styles.modalInfoValue}>{invoiceData.invoice_number}</Text>
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="person" size={16} color="#64748b" />
                <Text style={styles.modalInfoText}>
                  مشتری: <Text style={styles.modalInfoValue}>{invoiceData.full_name}</Text>
                </Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="sync" size={16} color={getStatusColor(currentStatus)} />
                <Text style={styles.modalInfoText}>
                  وضعیت فعلی: <Text style={[styles.modalInfoValue, { color: getStatusColor(currentStatus) }]}>
                    {getStatusText(currentStatus)}
                  </Text>
                </Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => !updating && setShowStatusModal(false)} disabled={updating}>
                <Text style={styles.modalCancelButtonText}>انصراف</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: selectedStatus?.color }]} onPress={confirmStatusChange} disabled={updating}>
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    {selectedStatus?.action === 'confirm' ? 'تایید و تبدیل' : selectedStatus?.action === 'reject' ? 'رد کن' : 'تایید پرداخت'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Modal */}
      <Modal visible={showServiceModal} transparent animationType="slide" onRequestClose={() => setShowServiceModal(false)}>
        <View style={styles.serviceModalOverlay}>
          <View style={styles.serviceModalContent}>
            <View style={styles.serviceModalHeader}>
              <Text style={styles.serviceModalTitle}>
                {editingServiceIndex !== null ? 'ویرایش سرویس' : 'افزودن سرویس جدید'}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)} style={styles.serviceModalCloseButton}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.serviceModalScrollView}>
              <View style={styles.serviceModalForm}>
                <View style={styles.serviceModalFormGroup}>
                  <Text style={styles.serviceModalLabel}>
                    نام سرویس <Text style={styles.requiredStar}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.serviceModalInput}
                    value={serviceForm.name}
                    onChangeText={(value) => setServiceForm({ ...serviceForm, name: value })}
                    placeholder="مثال:  عکاسی صنعتی"
                    textAlign="right"
                  />
                </View>

                <View style={styles.serviceModalRow}>
                  <View style={[styles.serviceModalFormGroup, { flex: 1 }]}>
                    <Text style={styles.serviceModalLabel}>
                      تعداد <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.serviceModalInput}
                      value={formatPriceInput(serviceForm.amount)}
                      onChangeText={(value) => {
                        const rawNumber = getRawNumber(value);
                        setServiceForm({ ...serviceForm, amount: rawNumber });
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>

                  <View style={[styles.serviceModalFormGroup, { flex: 1 }]}>
                    <Text style={styles.serviceModalLabel}>
                      قیمت واحد <Text style={styles.requiredStar}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.serviceModalInput}
                      value={formatPriceInput(serviceForm.unitPrice)}
                      onChangeText={(value) => {
                        const rawNumber = getRawNumber(value);
                        setServiceForm({ ...serviceForm, unitPrice: rawNumber });
                      }}
                      placeholder="0"
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                {serviceForm.amount && serviceForm.unitPrice && (
                  <View style={styles.serviceModalTotal}>
                    <View style={styles.totalIconContainer}>
                      <Ionicons name="calculator" size={18} color="#10b981" />
                    </View>
                    <View style={styles.totalTextContainer}>
                      <Text style={styles.serviceModalTotalLabel}>جمع این سرویس:</Text>
                      <Text style={styles.serviceModalTotalValue}>
                        {formatPriceDisplay((Number(getRawNumber(serviceForm.amount)) * Number(getRawNumber(serviceForm.unitPrice))).toString())} تومان
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.serviceModalButtons}>
              <TouchableOpacity style={styles.serviceModalCancelButton} onPress={() => setShowServiceModal(false)}>
                <Text style={styles.serviceModalCancelButtonText}>انصراف</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.serviceModalSaveButton} onPress={handleServiceSave}>
                <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.serviceModalSaveGradient}>
                  <Text style={styles.serviceModalSaveButtonText}>
                    {editingServiceIndex !== null ? 'بروزرسانی سرویس' : 'افزودن سرویس'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    direction: 'rtl'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    textAlign: 'center'
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B6B',
    borderRadius: 12
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerBackButton: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerContent: {
    flex: 1,
    alignItems: 'flex-start'
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'left'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffe4e6',
    textAlign: 'left'
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe4e2'
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'left'
  },
  infoGrid: {
    gap: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'right'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'left'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  paidAmountSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff1f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffe4e2'
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right'
  },
  paidStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  paidStatusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#166534',
    textAlign: 'center'
  },
  paidAmountCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  paidAmountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1
  },
  paidAmountInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500'
  },
  paidAmountCurrency: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#e2e8f0'
  },
  currencyText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600'
  },
  paidAmountPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
    textAlign: 'right'
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    textAlign: 'left'
  },
  confirmPaidButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  confirmPaidButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0,
    elevation: 0
  },
  confirmPaidGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8
  },
  confirmPaidButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5
  },
  servicesHeader: {
    justifyContent: 'space-between'
  },
  servicesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  addServiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4
  },
  addServiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  changesNotification: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 16,
    gap: 8
  },
  changesNotificationText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '500',
    textAlign: 'right'
  },
  servicesTable: {
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 8
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center'
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center'
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  serviceName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    textAlign: 'center'
  },
  serviceDescription: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center'
  },
  cellText: {
    fontSize: 13,
    color: '#334155',
    textAlign: 'center'
  },
  totalCell: {
    fontWeight: '700',
    color: '#FF6B6B'
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center'
  },
  editServiceButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe'
  },
  deleteServiceButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2'
  },
  emptyServices: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyServicesText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'right'
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B6B',
    textAlign: 'left'
  },
  saveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 20
  },
  saveAllButtonDisabled: {
    backgroundColor: '#cbd5e1'
  },
  saveAllButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  statusSection: {
    gap: 16
  },
  statusChangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8
  },
  statusChangeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  preInvoiceButtons: {
    flexDirection: 'row',
    gap: 12
  },
  confirmButton: {
    flex: 1
  },
  rejectButton: {
    flex: 1
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left'
  },
  modalText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24
  },
  modalInfo: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 12
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  modalInfoText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'right',
    flex: 1
  },
  modalInfoValue: {
    fontWeight: '600',
    color: '#1e293b'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center'
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  },
  serviceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  serviceModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%'
  },
  serviceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  serviceModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left'
  },
  serviceModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  serviceModalScrollView: {
    maxHeight: 400
  },
  serviceModalForm: {
    gap: 20
  },
  serviceModalFormGroup: {
    gap: 8
  },
  serviceModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'right'
  },
  requiredStar: {
    color: '#ef4444'
  },
  serviceModalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b'
  },
  serviceModalRow: {
    flexDirection: 'row',
    gap: 12
  },
  serviceModalTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 8,
    gap: 12
  },
  totalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  totalTextContainer: {
    flex: 1
  },
  serviceModalTotalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#065f46',
    textAlign: 'right',
    marginBottom: 4
  },
  serviceModalTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
    textAlign: 'right'
  },
  serviceModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  serviceModalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center'
  },
  serviceModalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center'
  },
  serviceModalSaveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  serviceModalSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  serviceModalSaveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center'
  }
});