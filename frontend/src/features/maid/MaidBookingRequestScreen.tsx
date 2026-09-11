import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  collection,
  getDocs,
  getFirestore,
} from '@react-native-firebase/firestore';

import {
  subscribeToMaidBookingRequest,
  respondToMaidBookingRequest,
  type MaidBookingRequest,
} from '../../services/firebase/maidBookingRequestService';

import { useMaidLanguage } from './MaidLanguageContext';

type Language = 'en' | 'hi';

const RESPONSE_WINDOW_MS = 3 * 60 * 1000;

const copy = {
  en: {
    title: 'New booking request',
    subtitle:
      'A customer needs help. Check the details before you respond.',
    customer: 'Customer',
    location: 'Service location',
    landmark: 'Landmark',
    dateTime: 'Date & time',
    duration: 'Duration',
    services: 'Services',
    earning: 'Your earning',
    travel: 'Your travel',
    accept: 'Accept booking',
    reject: 'Reject',
    accepting: 'Accepting...',
    rejecting: 'Rejecting...',
    away: 'away',
    min: 'min',
    expires: 'Respond within',
    expired: 'This request has expired.',
    rejected: 'You rejected this request.',
    loading: 'Loading booking request...',
    unavailable: 'Booking request not found.',
    unableToLoad: 'Unable to load booking request.',
    unableToRespond: 'Unable to respond to this request.',
    bookingAccepted: 'You got this booking.',
    anotherHelpAccepted:
      'Another Help accepted this booking first.',
    invalidRequest:
      'This booking request is no longer available.',
  },

  hi: {
    title: 'नया बुकिंग अनुरोध',
    subtitle:
      'एक ग्राहक को आपकी मदद चाहिए। जवाब देने से पहले जानकारी देखें।',
    customer: 'ग्राहक',
    location: 'सेवा की जगह',
    landmark: 'लैंडमार्क',
    dateTime: 'तारीख और समय',
    duration: 'समय',
    services: 'सेवाएं',
    earning: 'आपकी कमाई',
    travel: 'आपकी यात्रा',
    accept: 'स्वीकार करें',
    reject: 'अस्वीकार करें',
    accepting: 'स्वीकार किया जा रहा है...',
    rejecting: 'रिजेक्ट किया जा रहा है...',
    away: 'दूर',
    min: 'मिनट',
    expires: 'जवाब दें',
    expired: 'यह अनुरोध समाप्त हो गया है।',
    rejected: 'आपने यह अनुरोध रिजेक्ट कर दिया है।',
    loading: 'बुकिंग अनुरोध लोड हो रहा है...',
    unavailable: 'बुकिंग अनुरोध नहीं मिला।',
    unableToLoad:
      'बुकिंग अनुरोध लोड नहीं हो सका।',
    unableToRespond:
      'इस अनुरोध का जवाब नहीं दिया जा सका।',
    bookingAccepted:
      'यह बुकिंग आपको मिली।',
    anotherHelpAccepted:
      'किसी दूसरी Help ने पहले बुकिंग स्वीकार कर ली।',
    invalidRequest:
      'यह बुकिंग अनुरोध अब उपलब्ध नहीं है।',
  },
} as const;

function formatDateTime(
  value: unknown,
  language: Language,
): string {
  try {
    let date: Date;

    if (
      value &&
      typeof value === 'object' &&
      'toDate' in value &&
      typeof (
        value as { toDate?: unknown }
      ).toDate === 'function'
    ) {
      date = (
        value as {
          toDate: () => Date;
        }
      ).toDate();
    } else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(String(value));
    }

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString(
      language === 'hi' ? 'hi-IN' : 'en-IN',
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      },
    );
  } catch {
    return '—';
  }
}

function getInitials(name: string): string {
  const value = name.trim();

  if (!value) {
    return 'C';
  }

  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

function getRemainingSeconds(
  requestExpiresAt: unknown,
): number | null {
  try {
    let expiresAtMs: number;

    if (
      requestExpiresAt &&
      typeof requestExpiresAt === 'object' &&
      'toDate' in requestExpiresAt &&
      typeof (
        requestExpiresAt as { toDate?: unknown }
      ).toDate === 'function'
    ) {
      expiresAtMs = (
        requestExpiresAt as {
          toDate: () => Date;
        }
      ).toDate().getTime();
    } else if (
      requestExpiresAt instanceof Date
    ) {
      expiresAtMs =
        requestExpiresAt.getTime();
    } else if (
      typeof requestExpiresAt === 'string' ||
      typeof requestExpiresAt === 'number'
    ) {
      expiresAtMs = new Date(
        requestExpiresAt,
      ).getTime();
    } else {
      return null;
    }

    if (!Number.isFinite(expiresAtMs)) {
      return null;
    }

    return Math.max(
      0,
      Math.ceil(
        (expiresAtMs - Date.now()) /
          1000,
      ),
    );
  } catch {
    return null;
  }
}

function formatRemainingSeconds(
  seconds: number,
): string {
  const minutes = Math.floor(
    seconds / 60,
  );
  const remaining =
    seconds % 60;

  return `${minutes}:${String(
    remaining,
  ).padStart(2, '0')}`;
}

export default function MaidBookingRequestScreen({
  bookingId,
}: {
  bookingId: string;
}) {
  const insets =
    useSafeAreaInsets();

  const { language } =
    useMaidLanguage();

  const [request, setRequest] =
    useState<MaidBookingRequest | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isResponding, setIsResponding] =
    useState(false);

  const [error, setError] =
    useState('');

  const [categoryNames, setCategoryNames] =
    useState<Record<string, string>>(
      {},
    );

  const [nowMs, setNowMs] =
    useState(() => Date.now());

  const responseStartedRef =
    useRef(false);

  const t = copy[language];

  useEffect(() => {
    if (!bookingId?.trim()) {
      setIsLoading(false);
      setError(t.unableToLoad);
      return;
    }

    let active = true;

    const unsubscribe =
      subscribeToMaidBookingRequest(
        bookingId,
        (value) => {
          if (!active) {
            return;
          }

          setRequest(value);
          setIsLoading(false);

          if (
            value?.response !==
            'pending'
          ) {
            setIsResponding(false);
          }
        },
        (listenerError) => {
          if (!active) {
            return;
          }

          console.error(
            '[MaidBookingRequest] Listener failed:',
            listenerError,
          );

          setError(
            listenerError.message ||
              t.unableToLoad,
          );
          setIsLoading(false);
        },
      );

    async function loadCategoryNames() {
      try {
        const snapshot =
          await getDocs(
            collection(
              getFirestore(),
              'categories',
            ),
          );

        if (!active) {
          return;
        }

        const map: Record<
          string,
          string
        > = {};

        snapshot.docs.forEach(
          (item) => {
            const data =
              item.data();

            map[item.id] =
              typeof data.name ===
              'string'
                ? data.name
                : item.id;
          },
        );

        setCategoryNames(map);
      } catch (categoryError) {
        console.error(
          '[MaidBookingRequest] Category load failed:',
          categoryError,
        );
      }
    }

    void loadCategoryNames();

    return () => {
      active = false;
      unsubscribe();
    };
  }, [bookingId, t.unableToLoad]);

  const remainingSeconds =
    useMemo(() => {
      if (
        request?.response !==
        'pending'
      ) {
        return null;
      }

      return getRemainingSeconds(
        request.requestExpiresAt,
      );
    }, [request, nowMs]);

  useEffect(() => {
    if (
      request?.response !==
      'pending'
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setNowMs(Date.now());
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [request?.response]);

  useEffect(() => {
    if (
      request?.response !==
        'pending' ||
      remainingSeconds !== 0 ||
      responseStartedRef.current
    ) {
      return;
    }

    setError(t.invalidRequest);
  }, [
    request?.response,
    remainingSeconds,
    t.invalidRequest,
  ]);

  const handleResponse = async (
    response:
      | 'accepted'
      | 'rejected',
  ) => {
    if (
      isResponding ||
      !request ||
      request.response !==
        'pending'
    ) {
      return;
    }

    setError('');
    setIsResponding(true);
    responseStartedRef.current =
      true;

    try {
      await respondToMaidBookingRequest(
        request.bookingId,
        response,
      );

      /*
       * Do not blindly assume that writing "accepted"
       * means this Help actually won. The backend transaction
       * is the authority and may expire this request because
       * another Help won concurrently.
       *
       * Stay on this screen briefly while the live listener
       * receives the authoritative result.
       */
      if (response === 'rejected') {
        router.back();
      }
    } catch (responseError) {
      console.error(
        '[MaidBookingRequest] Response failed:',
        responseError,
      );

      setError(
        responseError instanceof Error
          ? responseError.message
          : t.unableToRespond,
      );

      setIsResponding(false);
      responseStartedRef.current =
        false;
    }
  };

  useEffect(() => {
    if (
      !request ||
      request.response ===
        'pending'
    ) {
      return;
    }

    if (
      request.response ===
      'accepted'
    ) {
      /*
       * The backend has now accepted this Help's request.
       * Replace the screen only after Firestore confirms the
       * authoritative accepted state.
       */
      router.replace(
        `/maid/booking/${request.bookingId}`,
      );
    }
  }, [
    request?.response,
    request?.bookingId,
  ]);

  if (isLoading) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#1F7A4C"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          {t.loading}
        </Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <Text
          style={
            styles.emptyTitle
          }
        >
          {error ||
            t.unavailable}
        </Text>

        <Pressable
          style={
            styles.backFallbackButton
          }
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={
              styles.backFallbackText
            }
          >
            {language === 'en'
              ? 'Go back'
              : 'वापस जाएं'}
          </Text>
        </Pressable>
      </View>
    );
  }

  const serviceNames =
    (request.categories ?? [])
      .map(
        (categoryId) =>
          categoryNames[
            categoryId
          ] ?? categoryId,
      );

  const travelText =
    request.distanceText &&
    request.etaText
      ? `${request.distanceText} ${t.away} • ${request.etaText}`
      : request.distanceText ||
        request.etaText ||
        '—';

  const isPending =
    request.response ===
    'pending';

  const isExpired =
    request.response ===
    'expired' ||
    (isPending &&
      remainingSeconds === 0);

  const actionBusyText =
    isResponding
      ? t.accepting
      : '';

  return (
    <View
      style={
        styles.container
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.content,
          {
            paddingTop:
              insets.top + 12,
            paddingBottom:
              insets.bottom + 30,
          },
        ]}
      >
        <View
          style={
            styles.header
          }
        >
          <Pressable
            style={
              styles.backButton
            }
            onPress={() =>
              router.back()
            }
            disabled={
              isResponding
            }
          >
            <Text
              style={
                styles.backIcon
              }
            >
              ‹
            </Text>
          </Pressable>

          <View
            style={
              styles.titleWrap
            }
          >
            <Text
              style={
                styles.eyebrow
              }
            >
              HOMEHELP
            </Text>

            <Text
              style={
                styles.title
              }
            >
              {t.title}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.subtitle
          }
        >
          {t.subtitle}
        </Text>

        <View
          style={
            styles.alertCard
          }
        >
          <View
            style={
              styles.customerAvatar
            }
          >
            <Text
              style={
                styles.customerAvatarText
              }
            >
              {getInitials(
                request.customerName ||
                  'Customer',
              )}
            </Text>
          </View>

          <View
            style={
              styles.alertMain
            }
          >
            <Text
              style={
                styles.customerLabel
              }
            >
              {t.customer}
            </Text>

            <Text
              style={
                styles.customerName
              }
            >
              {request.customerName ||
                'Customer'}
            </Text>

            {isPending &&
            remainingSeconds !==
              null ? (
              <Text
                style={
                  styles.responseDeadline
                }
              >
                {remainingSeconds > 0
                  ? `${t.expires} ${formatRemainingSeconds(
                      remainingSeconds,
                    )}`
                  : t.expired}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          style={
            styles.summaryCard
          }
        >
          <SummaryRow
            label={t.location}
            value={
              request
                .customerAddress
                ?.formatted ||
              '—'
            }
            icon="⌖"
          />

          {request
            .customerAddress
            ?.landmark ? (
            <>
              <View
                style={
                  styles.separator
                }
              />

              <SummaryRow
                label={t.landmark}
                value={
                  request
                    .customerAddress
                    .landmark
                }
                icon="⌑"
              />
            </>
          ) : null}

          <View
            style={
              styles.separator
            }
          />

          <SummaryRow
            label={t.dateTime}
            value={formatDateTime(
              request.scheduledDateTime,
              language,
            )}
            icon="◷"
          />

          <View
            style={
              styles.separator
            }
          />

          <SummaryRow
            label={t.duration}
            value={`${request.duration ?? '—'} hr`}
            icon="◴"
          />
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          {t.services}
        </Text>

        <View
          style={
            styles.tagsRow
          }
        >
          {serviceNames.length ? (
            serviceNames.map(
              (serviceName, index) => (
                <View
                  key={`${serviceName}-${index}`}
                  style={
                    styles.serviceTag
                  }
                >
                  <Text
                    style={
                      styles.serviceTagText
                    }
                  >
                    {serviceName}
                  </Text>
                </View>
              ),
            )
          ) : (
            <Text
              style={
                styles.emptyServiceText
              }
            >
              {language === 'en'
                ? 'No services'
                : 'कोई सेवा नहीं'}
            </Text>
          )}
        </View>

        <View
          style={
            styles.travelCard
          }
        >
          <View
            style={
              styles.travelIconCircle
            }
          >
            <Text
              style={
                styles.travelIcon
              }
            >
              ⇢
            </Text>
          </View>

          <View
            style={
              styles.travelContent
            }
          >
            <Text
              style={
                styles.travelLabel
              }
            >
              {t.travel}
            </Text>

            <Text
              style={
                styles.travelValue
              }
            >
              {travelText}
            </Text>
          </View>
        </View>

        <View
          style={
            styles.earningCard
          }
        >
          <Text
            style={
              styles.earningLabel
            }
          >
            {t.earning}
          </Text>

          <Text
            style={
              styles.earningValue
            }
          >
            ₹
            {typeof request.totalPrice ===
            'number'
              ? request.totalPrice
              : '—'}
          </Text>
        </View>

        {error ? (
          <View
            style={
              styles.errorBox
            }
          >
            <Text
              style={
                styles.errorIcon
              }
            >
              ⚠
            </Text>

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        ) : null}

        {request.response ===
        'expired' ? (
          <View
            style={
              styles.statusBox
            }
          >
            <Text
              style={
                styles.statusText
              }
            >
              {request.responseReason ||
                t.expired}
            </Text>
          </View>
        ) : request.response ===
          'rejected' ? (
          <View
            style={
              styles.statusBox
            }
          >
            <Text
              style={
                styles.statusText
              }
            >
              {t.rejected}
            </Text>
          </View>
        ) : request.response ===
          'accepted' ? (
          <View
            style={[
              styles.statusBox,
              styles.successStatusBox,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                styles.successStatusText,
              ]}
            >
              {t.bookingAccepted}
            </Text>
          </View>
        ) : isExpired ? (
          <View
            style={
              styles.statusBox
            }
          >
            <Text
              style={
                styles.statusText
              }
            >
              {t.expired}
            </Text>
          </View>
        ) : (
          <>
            {isResponding ? (
              <View
                style={
                  styles.respondingHint
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#1F7A4C"
                />

                <Text
                  style={
                    styles.respondingHintText
                  }
                >
                  {actionBusyText}
                </Text>
              </View>
            ) : null}

            <View
              style={
                styles.actions
              }
            >
              <Pressable
                style={
                  styles.rejectButton
                }
                onPress={() =>
                  handleResponse(
                    'rejected',
                  )
                }
                disabled={
                  isResponding
                }
              >
                {isResponding ? (
                  <ActivityIndicator
                    color="#B42318"
                  />
                ) : (
                  <Text
                    style={
                      styles.rejectText
                    }
                  >
                    {t.reject}
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={
                  styles.acceptButton
                }
                onPress={() =>
                  handleResponse(
                    'accepted',
                  )
                }
                disabled={
                  isResponding
                }
              >
                {isResponding ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                  />
                ) : (
                  <Text
                    style={
                      styles.acceptText
                    }
                  >
                    {t.accept}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <View
      style={
        styles.summaryRow
      }
    >
      <View
        style={
          styles.summaryIcon
        }
      >
        <Text>{icon}</Text>
      </View>

      <View
        style={
          styles.summaryContent
        }
      >
        <Text
          style={
            styles.summaryLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.summaryValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8F6',
  },

  content: {
    paddingHorizontal: 20,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: '#F7F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#737873',
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
  },

  backFallbackButton: {
    marginTop: 18,
    minWidth: 120,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E3E7E4',
  },

  backIcon: {
    fontSize: 34,
    lineHeight: 34,
    color: '#111111',
    marginTop: -3,
  },

  titleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },

  eyebrow: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#1F7A4C',
  },

  title: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
  },

  subtitle: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: '#737873',
  },

  alertCard: {
    marginTop: 20,
    padding: 17,
    borderRadius: 20,
    backgroundColor: '#EEF6F1',
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#DCEFE3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  customerAvatarText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  alertMain: {
    flex: 1,
  },

  customerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#657168',
  },

  customerName: {
    marginTop: 2,
    fontSize: 18,
    fontWeight: '800',
    color: '#17201A',
  },

  responseDeadline: {
    marginTop: 5,
    fontSize: 10,
    fontWeight: '800',
    color: '#A05A00',
  },

  summaryCard: {
    marginTop: 13,
    paddingHorizontal: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
  },

  summaryRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: '#EFF5F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryLabel: {
    fontSize: 10,
    color: '#858B87',
  },

  summaryValue: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#222222',
  },

  separator: {
    height: 1,
    backgroundColor: '#ECEFEC',
  },

  sectionTitle: {
    marginTop: 22,
    marginBottom: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#111111',
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  serviceTag: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: '#EAF5EE',
  },

  serviceTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  emptyServiceText: {
    fontSize: 12,
    color: '#737873',
  },

  travelCard: {
    marginTop: 15,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3E7E4',
    flexDirection: 'row',
    alignItems: 'center',
  },

  travelIconCircle: {
    width: 43,
    height: 43,
    borderRadius: 21,
    backgroundColor: '#EEF6F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  travelIcon: {
    fontSize: 20,
    color: '#1F7A4C',
  },

  travelContent: {
    flex: 1,
  },

  travelLabel: {
    fontSize: 10,
    color: '#858B87',
    fontWeight: '700',
  },

  travelValue: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#222222',
  },

  earningCard: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: '#EAF5EE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  earningLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#55705F',
  },

  earningValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1F7A4C',
  },

  statusBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF5E8',
  },

  successStatusBox: {
    backgroundColor: '#EAF5EE',
  },

  statusText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8B5600',
    fontWeight: '700',
    textAlign: 'center',
  },

  successStatusText: {
    color: '#1F7A4C',
  },

  respondingHint: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEF6F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  respondingHintText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F7A4C',
  },

  errorBox: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFF4F2',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorIcon: {
    marginRight: 8,
    fontSize: 15,
    color: '#B42318',
  },

  errorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#B42318',
  },

  actions: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },

  rejectButton: {
    flex: 0.8,
    height: 56,
    borderRadius: 17,
    backgroundColor: '#FFF2F0',
    borderWidth: 1,
    borderColor: '#F0C8C3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  rejectText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#B42318',
  },

  acceptButton: {
    flex: 1.2,
    height: 56,
    borderRadius: 17,
    backgroundColor: '#1F7A4C',
    alignItems: 'center',
    justifyContent: 'center',
  },

  acceptText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
