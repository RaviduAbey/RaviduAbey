import { stayDays } from '@tourist/core';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DrivingCard } from '@/src/checklist/DrivingCard';
import { EtaCard } from '@/src/checklist/EtaCard';
import { useChecklist } from '@/src/checklist/useChecklist';
import { formatDate } from '@/src/components/DateField';
import { useSession } from '@/src/lib/session';
import { strings } from '@/src/strings';
import { Body, ErrorText } from '@/src/ui/components';
import { colors, space } from '@/src/ui/theme';

export default function TripChecklist() {
  const router = useRouter();
  const { profile } = useSession();
  const { data, error, reload } = useChecklist();
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  const firstName = profile?.full_name.split(' ')[0] ?? '';

  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.body}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <Text style={styles.hi}>Hi {firstName}, here's what you need</Text>
      {data ? (
        <>
          <Body muted>
            {strings.checklist.dates(
              formatDate(data.trip.arrival_date),
              formatDate(data.trip.departure_date),
              stayDays(data.trip.arrival_date, data.trip.departure_date),
            )}
          </Body>
          <EtaCard
            visa={data.visa}
            openRequestId={data.openRequests.eta_application?.id ?? null}
            onGetHelp={() => router.push('/request/eta_application')}
            onViewRequest={(id) => router.push(`/requests/${id}`)}
          />
          <DrivingCard
            licence={data.licence}
            openRequestId={data.openRequests.driving_permit?.id ?? null}
            onGetHelp={() => router.push('/request/driving_permit')}
            onViewRequest={(id) => router.push(`/requests/${id}`)}
          />
        </>
      ) : error ? (
        <ErrorText>{strings.checklist.loadError}</ErrorText>
      ) : (
        <View style={{ paddingTop: space.xxl }}><ActivityIndicator color={colors.accent} /></View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.xl, gap: space.lg },
  hi: { fontSize: 24, fontWeight: '700', color: colors.fg, letterSpacing: -0.3 },
});
