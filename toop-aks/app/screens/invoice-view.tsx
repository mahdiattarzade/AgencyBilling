import React, { useState, useEffect, useRef } from 'react';
import { Image, View, Text, StyleSheet, ScrollView, I18nManager, Alert, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import toPersianWords from "num2persian";
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { FetchDocument } from '@/app/database/services/get-data';
import { useFonts } from 'expo-font';
import * as MediaLibrary from 'expo-media-library';

I18nManager.forceRTL(true);
export default function InvoicePage() {
  const [fontsLoaded] = useFonts({
    'Vazirmatn': require('@/app/assets/fonts/Vazirmatn-RD-Medium.ttf')
  });
  const params = useLocalSearchParams();
  const id = Number(params.id)
  const viewShotRef = useRef<ViewShot>(null);
  const tableViewShotRef = useRef<ViewShot>(null);
  const [invoice, setInvoice] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTotalPrice, setShowTotalPrice] = useState(false);

  // حالت‌های جدید برای قیمت دستی
  const [manualPriceModalVisible, setManualPriceModalVisible] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [finalTotalPrice, setFinalTotalPrice] = useState(0);
  const [priceCalculationMode, setPriceCalculationMode] = useState<'auto' | 'manual'>('auto');

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const data = await FetchDocument(id);
      setInvoice(data.invoice)
      setServices(data.services)
    } catch (err: any) {
      Alert.alert('خطا', 'خطا در دریافت اطلاعات فاکتور');
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, []);

  // نمایش دیالوگ بعد از لود شدن اطلاعات
  useEffect(() => {
    if (!loading && invoice) {
      setTimeout(() => {
        Alert.alert(
          'انتخاب روش محاسبه قیمت کل',
          'لطفاً روش محاسبه قیمت کل فاکتور را انتخاب کنید:',
          [
            {
              text: 'انصراف',
              style: 'cancel',
              onPress: () => {
                setShowTotalPrice(false);
              }
            },
            {
              text: 'محاسبه خودکار',
              style: 'default',
              onPress: () => {
                setPriceCalculationMode('auto');
                setShowTotalPrice(true);
                const total = calculateTotal();
                setFinalTotalPrice(total);
              }
            },
            {
              text: 'ورود دستی',
              style: 'destructive',
              onPress: () => {
                setPriceCalculationMode('manual');
                setShowTotalPrice(true);
                setManualPriceModalVisible(true);
              }
            }
          ]
        );
      }, 500);
    }
  }, [loading, invoice]);

  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>در حال دریافت اطلاعات...</Text>
      </SafeAreaView>
    )
  }

  const captureImage = async (ref: React.RefObject<ViewShot>) => {
    if (!ref.current) return;
    try {
      const uri = await ref.current.capture?.();
      return uri;
    } catch (error) {
      console.log('Capture error:', error);
      return null;
    }
  };

  const calculateTotal = () => {
    return services.reduce((sum, service) => {
      const unitPrice = service.unit_price || service.unitPrice || 0;
      const amount = service.amount || 0;
      return sum + (unitPrice * amount);
    }, 0);
  };

  const shareInvoice = async () => {
    try {
      const capturedInvoice = await captureImage(viewShotRef);
      if (!capturedInvoice) return;
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(capturedInvoice);
      }
      else {
        Alert.alert('خطا', 'اشتراک‌گذاری در این دستگاه پشتیبانی نمی‌شود');
      }
    }
    catch (err) {
      console.log('Error', err)
    }
  };

  const shareRawInvoice = async () => {
    try {
      const capturedTable = await captureImage(tableViewShotRef);
      if (!capturedTable) return;
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(capturedTable);
      }
      else {
        Alert.alert('خطا', 'اشتراک‌گذاری در این دستگاه پشتیبانی نمی‌شود');
      }
    }
    catch (err) {
      console.log('Error', err)
    }
  };

  const saveToGallery = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync(true);
      if (status !== 'granted') {
        Alert.alert("دسترسی غیرمجاز", "لطفاً برای ذخیره‌سازی تصاویر مجوز دهید"); return;
      }
      const uri = await captureImage(viewShotRef);
      if (!uri) {
        Alert.alert('خطا', 'امکان ثبت تصویر وجود ندارد، لطفاً دوباره تلاش کنید');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('موفق', 'فاکتور با موفقیت در گالری ذخیره شد.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong while saving');
    }
  };

  const calculateRemaining = () => {
    if (!invoice) return 0;
    const total = priceCalculationMode === 'manual' ? finalTotalPrice : calculateTotal();
    const paid = invoice.paid_amount || 0;
    return total - paid;
  };

  // تابع برای تبدیل عدد به فرمت فارسی با کاما
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // تابع برای ذخیره قیمت دستی - اصلاح کامل
  const handleManualPriceSubmit = () => {
    // حذف همه کاماها و کاراکترهای غیرعددی
    const cleanPrice = manualPrice.replace(/,/g, '').replace(/\s/g, '');

    if (cleanPrice === '') {
      Alert.alert('خطا', 'لطفاً یک عدد معتبر وارد کنید');
      return;
    }

    const price = Number(cleanPrice);

    if (isNaN(price) || price <= 0) {
      Alert.alert('خطا', 'لطفاً یک عدد معتبر بزرگتر از صفر وارد کنید');
      return;
    }

    setFinalTotalPrice(price);
    setManualPriceModalVisible(false);
    setShowTotalPrice(true);
    setManualPrice(''); // پاک کردن فیلد بعد از تایید
  };

  const remaningAmount = calculateRemaining();

  if (loading && !invoice) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>در حال دریافت اطلاعات...</Text>
      </SafeAreaView>
    )
  }

  const minRow = 7
  if (services.length < minRow) {
    setServices(prev => [
      ...prev,
      ...Array(minRow - prev.length).fill({}).map(() => ({}))
    ])
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }} >
      <View style={styles.main}>
        {/* مودال ورود قیمت دستی - اصلاح کامل */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={manualPriceModalVisible}
          onRequestClose={() => {
            setManualPriceModalVisible(false);
            setShowTotalPrice(false);
            setManualPrice(''); // پاک کردن فیلد هنگام بسته شدن
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>ورود قیمت کل به صورت دستی</Text>
              <Text style={styles.modalSubtitle}>لطفاً مبلغ کل فاکتور را به تومان وارد کنید:</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="مبلغ را وارد کنید"
                keyboardType="numeric"
                value={manualPrice}
                onChangeText={(text) => {
                  // حذف همه کاراکترهای غیرعددی
                  const numbersOnly = text.replace(/[^0-9]/g, '');

                  if (numbersOnly === '') {
                    setManualPrice('');
                    return;
                  }

                  // تبدیل به عدد
                  const number = parseInt(numbersOnly, 10);

                  if (!isNaN(number) && number > 0) {
                    // فرمت کردن با کاما
                    const formatted = formatNumber(number);
                    setManualPrice(formatted);
                  } else if (numbersOnly === '0') {
                    setManualPrice('0');
                  }
                }}
                textAlign="center"
                fontFamily="Vazirmatn"
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleManualPriceSubmit}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setManualPriceModalVisible(false);
                    setShowTotalPrice(false);
                    setManualPrice(''); // پاک کردن فیلد
                  }}
                >
                  <Text style={styles.modalButtonText}>انصراف</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalConfirmButton]}
                  onPress={handleManualPriceSubmit}
                >
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>تایید</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 1 }} style={{ backgroundColor: 'white' }} >
          <View style={styles.header}>
            <Image
              source={require('../assets/images/header.jpg')}
              style={{
                width: '410',
                height: '85',
              }}
              resizeMode='"contain'
            />
          </View>
          <ViewShot ref={tableViewShotRef} options={{ format: "jpg", quality: 1 }} style={{ backgroundColor: 'white' }}>
            <View style={styles.invoice_number_container}>
              {invoice?.document_type === 'preinvoice' && (
                <View style={styles.preinvoice_badge}>
                  <Text style={styles.preinvoice_text} >پیش فاکتور</Text>
                </View>
              )}
              <View style={styles.invoice_number}>
                <Text style={styles.input_text}>
                  {invoice?.invoice_number}
                </Text>
                <Text style={styles.invoice_number_text}>
                  شماره فاکتور :
                </Text>
              </View>
            </View>

            <View style={styles.information}>
              <LinearGradient
                colors={['black', 'rgba(116, 19, 9, 0)']}
                start={{ x: 0, y: -1 }}
                end={{ x: 1.6, y: 0 }}
                style={styles.name_customer_text}
              >
                <Text style={styles.name_customer_text} >صورتحساب آقای/شرکت:</Text>
              </LinearGradient>
              <Text style={styles.customer_name_text} >{invoice?.full_name}</Text>
              <Text style={styles.date} >تاریخ: {invoice?.created_at}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
              <View style={styles.table}>
                <View style={styles.tableRow}>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1, fontFamily: 'Vazirmatn' }]}>ردیف</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 3.8, fontFamily: 'Vazirmatn' }]}>خدمات</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1, fontFamily: 'Vazirmatn' }]}>تعداد</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1.7, fontFamily: 'Vazirmatn' }]}>قیمت واحد</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 3.5, fontFamily: 'Vazirmatn' }]}>مبلغ کل (تومان)</Text>
                </View>

                {services.length === 0 ? (
                  <View style={styles.emptyServices}>
                    <Ionicons name="list" size={48} color="#cbd5e1" />
                    <Text style={styles.emptyServicesText}>سرویسی وجود ندارد</Text>
                  </View>
                ) : (
                  services.map((service, index) => {
                    const unitPrice = service.unit_price || service.unitPrice || '';
                    const amount = service.amount || '';
                    const total = amount * unitPrice || '';

                    return (
                      <View
                        key={index}
                        style={[
                          styles.tableRow,
                          { backgroundColor: index % 2 === 0 ? '#fff' : '#f0f0f0' },
                        ]}
                      >
                        <View style={[
                          styles.cell,
                          {
                            flex: 1,
                            padding: 0,
                            overflow: 'hidden',
                            borderTopLeftRadius: 4000,
                            borderBottomLeftRadius: 4000,
                            borderBottomRightRadius: 800,
                            borderTopRightRadius: 800,
                            borderWidth: 0,
                          }
                        ]}>
                          {index % 2 === 0 ? (
                            <LinearGradient
                              colors={['black', 'rgba(230, 0, 23, 0)']}
                              start={{ x: 0, y: 1 }}
                              end={{ x: 2, y: 1 }}
                              style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
                            >
                              <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold', textAlign: 'center', width: '100%' }}>
                                {index + 1}
                              </Text>
                            </LinearGradient>
                          ) : (
                            <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'rgba(212, 0, 22, 0.99)', justifyContent: 'center', alignItems: 'center' }}>
                              <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold', textAlign: 'center' }}>
                                {index + 1}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.cell, { flex: 3.8, textAlign: 'center', paddingVertical: 1 }]}>{service.service}</Text>
                        <Text style={[styles.cell, { flex: 1, textAlign: 'center', paddingVertical: 2 }]}> {amount.toLocaleString('fa-IR')}</Text>
                        <Text style={[styles.cell, { flex: 1.7, textAlign: 'center', paddingVertical: 2, textAlignVertical: 'center', }]}> {unitPrice.toLocaleString('fa-IR')}</Text>
                        <Text style={[styles.cell, { flex: 3.5, textAlign: 'center', paddingVertical: 2 }]}>{total.toLocaleString('fa-IR')}</Text>
                      </View>
                    )
                  })
                )}
              </View>
            </ScrollView>

            <View style={styles.amount_paid} >
              <Text style={styles.text_amount_paid}>
                پرداخت شده:  {invoice?.paid_amount?.toLocaleString('fa-IR') || '0' + ' تومان'}
              </Text>
            </View>

            <View style={styles.amounts}>
              {showTotalPrice === true ? (
                <React.Fragment>
                  <View style={styles.amounts_by_word}>
                    <Text style={styles.text_by_word}>
                      قابل پرداخت(به حروف):  {toPersianWords(remaningAmount) + ' تومان'}
                    </Text>
                  </View>
                  <View style={styles.amounts_by_number}>
                    <Text style={styles.text_by_number}>
                      قابل پرداخت(به عدد):   {remaningAmount.toLocaleString('fa-IR')} تومان
                    </Text>
                  </View>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <View style={styles.amounts_by_word}>
                    <Text style={styles.text_by_word}>
                      جمع کل(به حروف):
                    </Text>
                  </View>
                  <View style={styles.amounts_by_number}>
                    <Text style={styles.text_by_number}>
                      جمع کل (به عدد):
                    </Text>
                  </View>
                </React.Fragment>)}
            </View>
          </ViewShot>

          <View style={styles.description}>
            <Text style={styles.text_description}>توضیحات:  {invoice?.description}</Text>
            <Text style={styles.signature}> امضا کارفرما:</Text>

            <View style={styles.stamp}>
              <Text style={styles.signature_}>مهر و امضا مجری:</Text>
              <Image source={require('../assets/images/mohr-.png')}
                style={{
                  width: '75',
                  height: '23.5',
                  marginTop: 6,
                }}
                resizeMode='"contain' />
            </View>
          </View>

          <View style={styles.fotter}>
            <Image
              source={require('../assets/images/footer.jpg')}
              style={{
                width: '400',
                height: '150',
                marginTop: 11
              }}
              resizeMode='"contain'
            />
          </View>
        </ViewShot>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.floatingButton} onPress={shareInvoice} activeOpacity={0.8}>
            <Ionicons name='camera' size={15} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingButton} onPress={shareRawInvoice} activeOpacity={0.8}>
            <Ionicons name='document-text' size={15} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingButton} onPress={saveToGallery} activeOpacity={0.8}>
            <Ionicons name="save-outline" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </View >
    </SafeAreaView >
  );
};

const styles = StyleSheet.create({
  emptyServices: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  emptyServicesText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontFamily: 'Vazirmatn'
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 24 },
  main: {
    backgroundColor: 'white',
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
  },
  invoice_number_container: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 1,
    backgroundColor: 'white',
  },
  preinvoice_badge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 2,
    alignSelf: 'flex-start',
  },
  preinvoice_text: {
    color: 'white',
    fontSize: 9,
    textAlign: 'center',
    fontFamily: 'Vazirmatn'
  },
  invoice_number: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    fontFamily: 'Vazirmatn'
  },
  invoice_number_text: {
    fontSize: 9,
    color: '#333',
    textAlign: 'right',
    flex: 5,
    fontFamily: 'Vazirmatn'
  },
  input_text: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 6,
    fontSize: 7.8,
    textAlign: 'center',
    backgroundColor: '#fff',
    height: 25,
    width: 85,
    textAlignVertical: 'center',
    fontFamily: 'Vazirmatn'
  },
  container: {
    padding: 6,
    backgroundColor: '#fff',
  },
  table: {
    minHeight: 200,
    maxHeight: 340,
    backgroundColor: 'white'
  },
  tableRow: {
    flexDirection: 'row',
    marginVertical: 1,
    marginHorizontal: 5,
  },
  cell: {
    borderWidth: 1,
    borderColor: '#000',
    marginHorizontal: 1.2,
    textAlignVertical: 'center',
    paddingHorizontal: 0.1,
    borderRadius: 6,
    width: 20,
    fontSize: 7.4,
    textAlign: 'center',
    minHeight: 20,
    fontFamily: 'Vazirmatn'
  },
  headerCell: {
    backgroundColor: '#da1d1d',
    color: '#fff',
    borderWidth: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 1,
    width: 90,
    height: 20,
    fontSize: 9,
    fontFamily: 'Vazirmatn'
  },
  information: {
    marginTop: 7,
    flexDirection: 'row',
    gap: 7,
    marginHorizontal: 12,
    borderColor: 'gray',
    backgroundColor: 'white',
    borderWidth: 0.9,
    height: 23,
    borderBottomRightRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 40,
    borderTopLeftRadius: 30,
    textAlignVertical: 'center'
  },
  date: {
    fontSize: 8.3,
    position: 'absolute',
    left: 275,
    top: 3,
    fontFamily: 'Vazirmatn',
    alignItems: 'center',
    textAlignVertical: 'center'
  },
  name_customer_text: {
    color: 'white',
    fontSize: 9,
    borderBottomRightRadius: 10,
    borderTopRightRadius: 10,
    width: 115,
    height: '100%',
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  customer_name_text: {
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 10,
    fontFamily: 'Vazirmatn'
  },
  amount_paid: {
    backgroundColor: 'white',
    height: 21,
    alignItems: 'center',
    fontFamily: 'Vazirmatn',
    textAlignVertical: 'center',
  },
  text_amount_paid: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    fontSize: 7,
    height: 18.8,
    width: 192,
    marginLeft: 10,
    borderColor: 'gray',
    padding: 0,
    fontFamily: 'Vazirmatn',
    textAlign: 'center',
    textAlignVertical: 'center'
  },
  amounts: {
    backgroundColor: 'white',
    flexDirection: 'row',
    gap: 2,
    height: 21,
    fontFamily: 'Vazirmatn'
  },
  amounts_by_word: {
    alignItems: 'center',
  },
  amounts_by_number: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    height: 19,
    borderColor: 'gray',
    padding: 1,
    textAlign: 'center',
    width: 170,
    fontFamily: 'Vazirmatn'
  },
  text_by_word: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    fontSize: 6,
    minHeight: 19,
    maxHeight: 35,
    width: 192,
    marginLeft: 10,
    borderColor: 'gray',
    textAlignVertical: 'center',
    padding: 2,
    fontFamily: 'Vazirmatn',
  },
  text_by_number: {
    fontSize: 7,
    fontFamily: 'Vazirmatn',
  },
  description: {
    flexDirection: 'row',
    marginLeft: 15,
    fontFamily: 'Vazirmatn',
    marginTop: 6,
    gap: 5,
    minHeight: 45,
    maxHeight: 130,
  },
  text_description: {
    fontSize: 7,
    minWidth: 100,
    maxWidth: 200,
    fontFamily: 'Vazirmatn'
  },
  signature: {
    fontSize: 6.6,
    fontFamily: 'Vazirmatn'
  },
  signature_: {
    fontSize: 6.5,
    marginLeft: 40,
    fontFamily: 'Vazirmatn',
    height: 14,
  },
  fotter: {
    marginLeft: -17,
    backgroundColor: 'white'
  },
  buttons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  floatingButton: {
    backgroundColor: '#a70101',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 29,
    gap: 4,
    marginHorizontal: 10,
    marginVertical: 10,
    shadowColor: '#000',
    marginTop: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    width: '28%',
    alignSelf: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Vazirmatn'
  },
  stamp: {
    alignItems: 'flex-end',
    marginRight: 14,
    height: 44,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    fontFamily: 'Vazirmatn'
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Vazirmatn'
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 18,
    width: '100%',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Vazirmatn',
    backgroundColor: '#f9f9f9'
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 80,
    alignItems: 'center',
    flex: 1,
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalConfirmButton: {
    backgroundColor: '#a70101',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Vazirmatn'
  },
});