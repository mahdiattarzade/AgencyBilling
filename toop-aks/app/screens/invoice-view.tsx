import React, { useState, useEffect, useRef } from 'react';
import { Image, View, Text, StyleSheet, ScrollView, I18nManager, Alert, ActivityIndicator, TouchableOpacity, AccessibilityInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import toPersianWords from "num2persian";
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { FetchDocument } from '@/app/database/services/get-data';

I18nManager.forceRTL(true);

export default function InvoicePage() {
  const params = useLocalSearchParams();
  const id = Number(params.id)
  const viewShotRef = useRef<ViewShot>(null);
  const tableViewShotRef = useRef<ViewShot>(null); // رفرنس جدید برای جدول

  const [invoice, setInvoice] = useState<any | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTotalPrice, setShowTotalPrice] = useState(false)

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
    Alert.alert(
      'نمایش قیمت کل',
      'ایا میخواهید قیمت کل در این فاکتور درج شود ؟',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'بله', style: 'destructive',
          onPress: () => {
            setShowTotalPrice(true);
          }
        }
      ]
    )
  }, []);

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

  // تابع جدید برای اشتراک‌گذاری فقط جدول
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

  const calculateRemaining = () => {
    if (!invoice) return 0;

    const total = calculateTotal();
    const paid = invoice.paid_amount || 0;
    return total - paid
  }

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
        {/* ویو اصلی با هدر و فوتر */}
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
            {/* بخش شماره فاکتور با قابلیت نمایش پیش‌فاکتور */}
            <View style={styles.invoice_number_container}>
              {invoice.document_type === 'preinvoice' && (
                <View style={styles.preinvoice_badge}>
                  <Text style={styles.preinvoice_text}>پیش فاکتور</Text>
                </View>
              )}
              <View style={styles.invoice_number}>
                <Text style={styles.input_text}>
                  {invoice.invoice_number}
                </Text>
                <Text style={styles.invoice_number_text}>
                  شماره فاکتور
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
              <Text style={styles.customer_name_text} >{invoice.full_name}</Text>
              <Text style={styles.date} >تاریخ: {invoice.created_at}</Text>
            </View>

            {/* جدول با رفرنس جداگانه */}

            <ScrollView contentContainerStyle={styles.container}>
              {/* جدول */}
              <View style={styles.table}>
                {/* هدر */}
                <View style={styles.tableRow}>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>ردیف</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 3.8 }]}>خدمات</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1 }]}>تعداد</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 1.7 }]}>قیمت واحد</Text>
                  <Text style={[styles.cell, styles.headerCell, { flex: 3.5 }]}>مبلغ کل (تومان)</Text>
                </View>

                {/* ردیف‌ها */}
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
                        <Text style={[styles.cell, { flex: 1.7, textAlign: 'center', paddingVertical: 2 }]}> {unitPrice.toLocaleString('fa-IR')}</Text>
                        <Text style={[styles.cell, { flex: 3.5, textAlign: 'center', paddingVertical: 2 }]}>{total.toLocaleString('fa-IR')}</Text>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {/* بخش‌هایی که داخل جدول هستند */}
            <View style={styles.amount_paid} >
              <Text style={styles.text_amount_paid}>
                پرداخت شده:  {invoice.paid_amount.toLocaleString('fa-IR') + ' تومان'}
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

            <View style={styles.description}>
              <Text style={styles.text_description}>توضیحات:  {invoice.description}</Text>
              <Text style={styles.signature}> امضا کارفرما:</Text>



              <View style={styles.stamp}>
                <Text style={styles.signature_}>مهر و امضا مجری:</Text>
                <Image source={require('../assets/images/ATA.png')}
                  style={{
                    width: '75',
                    height: '23.5',
                    marginTop: 6,

                  }}
                  resizeMode='"contain' />
              </View>
            </View>

          </ViewShot>

          <View style={styles.fotter}>

            <Image
              source={require('../assets/images/footer.jpg')}
              style={{
                width: '400',
                height: '150',
                marginTop: 5

              }}
              resizeMode='"contain'
            />
          </View>

        </ViewShot>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.floatingButton} onPress={shareInvoice} activeOpacity={0.8}>
            <Ionicons name='camera' size={15} color="#fff" />
            <Text style={styles.floatingButtonText}>اشتراک‌ گذاری</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.floatingButton} onPress={shareRawInvoice} activeOpacity={0.8}>
            <Ionicons name='document-text' size={15} color="#fff" />
            <Text style={styles.floatingButtonText}>اشتراک فاکتور خام</Text>
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
    textAlign: 'center'
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  invoice_number: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10
  },
  invoice_number_text: {
    fontSize: 8,
    fontWeight: '900',
    color: '#333',
    textAlign: 'right',
    flex: 5,
  },
  input_text: {
    borderWidth: 1,
    borderColor: 'gray',
    borderRadius: 6,
    fontSize: 7.8,
    fontWeight: '900',
    textAlign: 'center',
    backgroundColor: '#fff',
    height: 25,
    width: 85,
    textAlignVertical: 'center'
  },
  container: {
    padding: 6,
    backgroundColor: '#fff',
  },
  table: {
    minHeight: 200,
    maxHeight: 320,
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
    fontSize: 8,
    textAlign: 'center',
    fontWeight: '900',
    minHeight: 20,
  },
  headerCell: {
    backgroundColor: '#da1d1d',
    color: '#fff',
    fontWeight: 'bold',
    borderWidth: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingVertical: 1,
    width: 90,
    height: 20,
    fontSize: 9,
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
  },
  date: {
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    left: 275,
    top: 3,
  },
  name_customer_text: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
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
    fontWeight: '900',
  },
  amount_paid: {
    backgroundColor: 'white',
    height: 21,
    alignItems: 'center'
  },
  text_amount_paid: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    fontSize: 8,
    fontWeight: '900',
    height: 18.6,
    width: 192,
    marginLeft: 10,
    borderColor: 'gray',
    textAlignVertical: 'center',
    padding: 2
  },
  amounts: {
    backgroundColor: 'white',
    flexDirection: 'row',
    gap: 2,
    height: 21
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
    width: 170
  },
  text_by_word: {
    borderWidth: 1,
    backgroundColor: 'white',
    borderRadius: 6,
    fontSize: 5.6,
    fontWeight: '900',
    minHeight: 19,
    maxHeight: 35,
    width: 192,
    marginLeft: 10,
    borderColor: 'gray',
    textAlignVertical: 'center',
    padding: 2
  },
  text_by_number: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  description: {
    flexDirection: 'row',
    marginLeft: 15,

    marginTop: 6,
    gap: 5,
    minHeight: 45,
    maxHeight: 50,
  },
  text_description: {
    fontSize: 7,
    fontWeight: '900',
    minWidth: 100,
    maxWidth: 200,
  },
  signature: {
    fontSize: 6.6,
    fontWeight: '900',
  },
  signature_: {
    fontSize: 6.6,
    marginLeft: 40,
    fontWeight: '900',
    height: 10,

  },
  fotter: {
    marginLeft: -17,
    backgroundColor: 'white'
  },
  buttons: {
    flexDirection: 'row'
  },
  floatingButton: {
    backgroundColor: 'black',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
    width: '45%',
    alignSelf: 'center',
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stamp: {
    alignItems: 'flex-end',
    marginRight: 10,
    height: 44,

  },


});