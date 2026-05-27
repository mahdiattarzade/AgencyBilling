import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import moment from "moment-jalaali";
import { AddNewInvoice } from '@/app/database/services/add-data';

export default function AddInvoice() {
  const { action } = useLocalSearchParams();
  const router = useRouter();
  const [invoiceType, setInvoiceType] = useState<'invoice' | 'preinvoice'>('invoice');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingServiceIndex, setEditingServiceIndex] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize moment with Persian
  moment.loadPersian({ usePersianDigits: true });

  // Main form data
  const [formData, setFormData] = useState({
    customer: '',
    date: moment().format('jYYYY/jMM/jDD'), // Default to today
    notes: ''
  });

  // Services array (multiple services per invoice)
  const [services, setServices] = useState<any[]>([{
    id: '1',
    name: '',
    amount: '',
    unitPrice: '',
  }]);

  // Service form for modal
  const [serviceForm, setServiceForm] = useState({
    name: '',
    amount: '',
    unitPrice: '',
  });

  // تابع فرمت‌کننده قیمت با جداکننده هزارگان (برای نمایش)
  const formatPrice = (value: string): string => {
    if (!value) return '';

    // حذف همه کاراکترهای غیرعددی
    const rawNumber = value.replace(/[^0-9]/g, '');
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

  // Calculate total from all services
  const calculateTotal = () => {
    return services.reduce((total, service) => {
      const amount = Number(getRawNumber(service.amount)) || 0;
      const unitPrice = Number(getRawNumber(service.unitPrice)) || 0;
      return total + (amount * unitPrice);
    }, 0);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Simple Date Picker Component
  const SimpleDatePicker = () => {
    // Generate last 30 days and next 30 days
    const generateDates = () => {
      const dates = [];
      const today = moment();

      // Last 30 days
      for (let i = 30; i >= 1; i--) {
        const date = today.clone().subtract(i, 'days');
        dates.push({
          id: `past-${i}`,
          date: date.format('jYYYY/jMM/jDD'),
          label: date.format('jYYYY/jMM/jDD'),
        });
      }

      // Today
      dates.push({
        id: 'today',
        date: today.format('jYYYY/jMM/jDD'),
        label: `${today.format('jYYYY/jMM/jDD')} (امروز)`,
        isToday: true
      });

      // Next 30 days
      for (let i = 1; i <= 30; i++) {
        const date = today.clone().add(i, 'days');
        dates.push({
          id: `future-${i}`,
          date: date.format('jYYYY/jMM/jDD'),
          label: date.format('jYYYY/jMM/jDD'),
        });
      }

      return dates;
    };

    const dates = generateDates();

    return (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>انتخاب تاریخ</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dateList}>
              {dates.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.dateItem,
                    item.date === formData.date && styles.selectedDateItem
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, date: item.date }));
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[
                    styles.dateItemText,
                    item.date === formData.date && styles.selectedDateItemText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Service Management Functions
  const handleAddService = () => {
    setServiceForm({
      name: '',
      amount: '',
      unitPrice: '',
    });
    setEditingServiceIndex(null);
    setShowServiceModal(true);
  };

  const handleEditService = (index: number) => {
    const service = services[index];
    setServiceForm({
      name: service.name,
      amount: getRawNumber(service.amount),
      unitPrice: getRawNumber(service.unitPrice),
    });
    setEditingServiceIndex(index);
    setShowServiceModal(true);
  };

  const handleDeleteService = (index: number) => {
    Alert.alert(
      'حذف سرویس',
      'آیا مطمئن هستید که می‌خواهید این سرویس را حذف کنید؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            const newServices = services.filter((_, i) => i !== index);
            if (newServices.length === 0) {
              // Add empty service if all are deleted
              setServices([{
                id: '1',
                name: '',
                amount: '',
                unitPrice: '',
              }]);
            } else {
              setServices(newServices);
            }
          }
        }
      ]
    );
  };

  const handleSaveService = () => {
    // Validate service form
    if (!serviceForm.name.trim()) {
      Alert.alert('خطا', 'لطفا نام خدمت را وارد کنید');
      return;
    }

    const rawAmount = getRawNumber(serviceForm.amount);
    const rawUnitPrice = getRawNumber(serviceForm.unitPrice);

    if (!rawAmount || isNaN(Number(rawAmount))) {
      Alert.alert('خطا', 'لطفا مقدار صحیح وارد کنید');
      return;
    }

    if (!rawUnitPrice || isNaN(Number(rawUnitPrice))) {
      Alert.alert('خطا', 'لطفا قیمت واحد صحیح وارد کنید');
      return;
    }

    const newService = {
      id: editingServiceIndex !== null ? services[editingServiceIndex].id : (services.length + 1).toString(),
      name: serviceForm.name,
      amount: rawAmount,
      unitPrice: rawUnitPrice,
    };

    if (editingServiceIndex !== null) {
      // Update existing service
      const updatedServices = [...services];
      updatedServices[editingServiceIndex] = newService;
      setServices(updatedServices);
    } else {
      // Add new service
      setServices([...services, newService]);
    }

    setShowServiceModal(false);
    setEditingServiceIndex(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.customer.trim()) {
      Alert.alert('خطا', 'لطفا نام مشتری را وارد کنید');
      return;
    }

    if (!formData.date.trim()) {
      Alert.alert('خطا', 'لطفا تاریخ را وارد کنید');
      return;
    }

    // Check if all services are valid
    const invalidServices = services.filter(service =>
      !service.name.trim() ||
      !getRawNumber(service.amount) ||
      !getRawNumber(service.unitPrice)
    );

    if (invalidServices.length > 0) {
      Alert.alert('خطا', 'لطفا اطلاعات تمام سرویس‌ها را کامل وارد کنید');
      return;
    }

    // Prepare services data
    const servicesData = services.map(service => ({
      name: service.name,
      amount: Number(getRawNumber(service.amount)),
      unitPrice: Number(getRawNumber(service.unitPrice)),
    }));

    // Prepare final data
    const finalData = {
      type: invoiceType,
      customer: formData.customer,
      date: formData.date,
      services: servicesData,
      notes: formData.notes,
      total: calculateTotal()
    };

    try {
      // Save to database
      AddNewInvoice(finalData.customer, finalData.type, action, finalData.date, finalData.services, finalData.notes)

      Alert.alert(
        'موفقیت',
        `${invoiceType === 'invoice' ? 'فاکتور' : 'پیش فاکتور'} با موفقیت ایجاد شد`,
        [
          {
            text: 'باشه',
            onPress: () => router.push('/')
          }
        ]
      );
    } catch (error) {
      Alert.alert('خطا', 'مشکلی در ایجاد فاکتور رخ داد');
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/')}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            ایجاد {invoiceType === 'invoice' ? 'فاکتور' : 'پیش فاکتور'}
          </Text>
          <Text style={styles.headerSubtitle}>
            فرم ایجاد {invoiceType === 'invoice' ? 'فاکتور' : 'پیش فاکتور'} جدید
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Invoice Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>انتخاب نوع</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                invoiceType === 'invoice' && styles.typeButtonActive
              ]}
              onPress={() => setInvoiceType('invoice')}
            >
              <Ionicons
                name="receipt"
                size={24}
                color={invoiceType === 'invoice' ? '#fff' : '#4f46e5'}
              />
              <Text style={[
                styles.typeButtonText,
                invoiceType === 'invoice' && styles.typeButtonTextActive
              ]}>
                فاکتور
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                invoiceType === 'preinvoice' && styles.typeButtonActive
              ]}
              onPress={() => setInvoiceType('preinvoice')}
            >
              <Ionicons
                name="document-text"
                size={24}
                color={invoiceType === 'preinvoice' ? '#fff' : '#f59e0b'}
              />
              <Text style={[
                styles.typeButtonText,
                invoiceType === 'preinvoice' && styles.typeButtonTextActive
              ]}>
                پیش فاکتور
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Customer */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>نام مشتری *</Text>
            <TextInput
              style={styles.input}
              placeholder="نام کامل مشتری"
              placeholderTextColor="#94a3b8"
              value={formData.customer}
              onChangeText={(value) => handleInputChange('customer', value)}
            />
          </View>

          {/* Date Picker */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>تاریخ *</Text>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <View style={styles.datePickerContent}>
                <Ionicons name="calendar" size={20} color="#FF6B6B" />
                <Text style={styles.datePickerText}>
                  {formData.date}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
            <SimpleDatePicker />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.formSection}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>یادداشت‌ها (اختیاری)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="توضیحات اضافی را وارد کنید"
              placeholderTextColor="#94a3b8"
              value={formData.notes}
              onChangeText={(value) => handleInputChange('notes', value)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.section}>
          <View style={styles.servicesHeader}>
            <View style={styles.servicesTitle}>
              <Ionicons name="list" size={20} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>سرویس‌ها ({services.length})</Text>
            </View>
            <TouchableOpacity
              style={styles.addServiceBtn}
              onPress={handleAddService}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.addServiceBtnText}>افزودن سرویس</Text>
            </TouchableOpacity>
          </View>

          {/* Services List */}
          <View style={styles.servicesList}>
            {services.map((service, index) => (
              <View key={service.id} style={styles.serviceItem}>
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>{service.name || 'خدمت جدید'}</Text>
                    <Text style={styles.serviceTotal}>
                      {(Number(getRawNumber(service.amount)) * Number(getRawNumber(service.unitPrice)) || 0).toLocaleString('fa-IR')} تومان
                    </Text>
                  </View>
                  <View style={styles.serviceDetail}>
                    <Text style={styles.serviceDetailText}>
                      تعداد: {formatPrice(service.amount)} | قیمت واحد: {service.unitPrice ? `${formatPrice(service.unitPrice)} تومان` : '۰ تومان'}
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceActions}>
                  <TouchableOpacity
                    style={styles.editServiceButton}
                    onPress={() => handleEditService(index)}
                  >
                    <Ionicons name="create" size={18} color="#0ea5e9" />
                  </TouchableOpacity>

                  {services.length > 1 && (
                    <TouchableOpacity
                      style={styles.deleteServiceButton}
                      onPress={() => handleDeleteService(index)}
                    >
                      <Ionicons name="trash" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Total Calculation */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>جمع کل:</Text>
            <Text style={styles.totalValue}>
              {calculateTotal().toLocaleString('fa-IR')} تومان
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.push('/')}
          >
            <Ionicons name="close" size={20} color="#64748b" />
            <Text style={styles.cancelButtonText}>انصراف</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>تایید و ذخیره</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Service Modal */}
      <Modal
        visible={showServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingServiceIndex !== null ? 'ویرایش سرویس' : 'افزودن سرویس جدید'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowServiceModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.modalForm}>
                <View style={styles.modalFormGroup}>
                  <Text style={styles.modalLabel}>نام خدمت *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={serviceForm.name}
                    onChangeText={(value) => setServiceForm({ ...serviceForm, name: value })}
                    placeholder="مثلا: عکاسی صنعتی"
                    textAlign="right"
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.modalFormGroup, { flex: 1 }]}>
                    <Text style={styles.modalLabel}>تعداد *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={formatPrice(serviceForm.amount)}
                      onChangeText={(value) => {
                        const rawNumber = getRawNumber(value);
                        setServiceForm({ ...serviceForm, amount: rawNumber });
                      }}
                      placeholder="۰"
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>

                  <View style={[styles.modalFormGroup, { flex: 1 }]}>
                    <Text style={styles.modalLabel}>قیمت واحد (تومان) *</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={formatPrice(serviceForm.unitPrice)}
                      onChangeText={(value) => {
                        const rawNumber = getRawNumber(value);
                        setServiceForm({ ...serviceForm, unitPrice: rawNumber });
                      }}
                      placeholder="۰"
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                {serviceForm.amount && serviceForm.unitPrice && (
                  <View style={styles.modalTotal}>
                    <Text style={styles.modalTotalLabel}>جمع این سرویس:</Text>
                    <Text style={styles.modalTotalValue}>
                      {(Number(getRawNumber(serviceForm.amount)) * Number(getRawNumber(serviceForm.unitPrice)) || 0).toLocaleString('fa-IR')} تومان
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowServiceModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>انصراف</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveService}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingServiceIndex !== null ? 'بروزرسانی' : 'افزودن'}
                </Text>
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
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e55e5e',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginLeft: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'right',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#ffe4e6',
    marginTop: 4,
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
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
    textAlign: 'right',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  typeButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  formSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
  },
  // Date Picker Styles
  datePickerButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  datePickerContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'right',
  },
  dateList: {
    maxHeight: 400,
  },
  dateItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  selectedDateItem: {
    backgroundColor: '#f0fdf4',
    borderRightWidth: 4,
    borderRightColor: '#10b981',
  },
  dateItemText: {
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
  },
  selectedDateItemText: {
    color: '#065f46',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Services Styles
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  servicesTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addServiceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  servicesList: {
    gap: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
  },
  serviceTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  serviceDetail: {
    gap: 2,
  },
  serviceDetailText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
  },
  serviceActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  editServiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  deleteServiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#065f46',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    gap: 8,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'right',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalForm: {
    gap: 16,
  },
  modalFormGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'right',
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#334155',
    textAlign: 'right',
  },
  modalTotal: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginTop: 8,
  },
  modalTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  modalTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065f46',
  },
  modalButtons: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  modalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});