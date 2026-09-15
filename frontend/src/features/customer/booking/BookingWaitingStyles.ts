import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F3",
  },

  geometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  geoCircleLarge: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -175,
    top: 72,
    backgroundColor: "#DDE6DB",
  },

  geoCircleSmall: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    left: -62,
    top: 360,
    backgroundColor: "#E9DFCC",
  },

  geoPill: {
    position: "absolute",
    width: 138,
    height: 34,
    borderRadius: 20,
    right: 18,
    top: 54,
    backgroundColor: "#C7D4C5",
    transform: [{ rotate: "-17deg" }],
  },

  geoDiamond: {
    position: "absolute",
    width: 86,
    height: 86,
    left: -34,
    top: 585,
    borderRadius: 24,
    backgroundColor: "#E6DCCB",
    transform: [{ rotate: "45deg" }],
  },

  geoArc: {
    position: "absolute",
    width: 190,
    height: 190,
    right: -102,
    bottom: 38,
    borderWidth: 28,
    borderColor: "#D8E1D6",
    borderRadius: 96,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "#F0F1EB",
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: 33,
    lineHeight: 34,
    color: "#242824",
    marginTop: -4,
  },

  headerCopy: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  headerEyebrow: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#8C938C",
  },

  headerTitle: {
    marginTop: 3,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
    color: "#252925",
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E4EADF",
  },

  statusPillCompleted: {
    backgroundColor: "#DDE9DC",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
    backgroundColor: "#5E765F",
  },

  completedCheck: {
    marginRight: 4,
    fontSize: 10,
    fontWeight: "900",
    color: "#507056",
  },

  statusPillText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#5E705F",
  },

  statusPillCompletedText: {
    color: "#4F6B54",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  heroGeometry: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  heroGeoCircle: {
    position: "absolute",
    width: 185,
    height: 185,
    borderRadius: 93,
    right: -58,
    top: -52,
    backgroundColor: "rgba(210,224,211,0.22)",
  },

  heroGeoRing: {
    position: "absolute",
    width: 122,
    height: 122,
    borderRadius: 61,
    right: 20,
    top: -22,
    borderWidth: 10,
    borderColor: "rgba(229,236,228,0.42)",
  },

  heroGeoDiamond: {
    position: "absolute",
    width: 58,
    height: 58,
    right: 40,
    bottom: 20,
    borderRadius: 16,
    backgroundColor: "rgba(221,207,182,0.22)",
    transform: [{ rotate: "45deg" }],
  },

  heroGeoArc: {
    position: "absolute",
    width: 92,
    height: 92,
    left: -45,
    bottom: -42,
    borderWidth: 14,
    borderColor: "rgba(209,222,210,0.28)",
    borderRadius: 48,
  },

  heroGeoLine: {
    position: "absolute",
    width: 92,
    height: 5,
    right: 32,
    bottom: 70,
    borderRadius: 99,
    backgroundColor: "rgba(220,230,220,0.25)",
    transform: [{ rotate: "-22deg" }],
  },

  heroStatus: {
    minHeight: 255,
    padding: 21,
    borderRadius: 34,
    backgroundColor: "#30483B",
    overflow: "hidden",
  },

  heroStatusCompleted: {
    minHeight: 235,
    backgroundColor: "#E8F0E6",
    borderWidth: 1,
    borderColor: "#CFDDD0",
  },

  heroStatusCancelled: {
    minHeight: 235,
    backgroundColor: "#EEEAE4",
    borderWidth: 1,
    borderColor: "#DED4C8",
  },

  heroStatusTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#AFC0B2",
  },

  completedEyebrow: {
    color: "#6A816C",
  },

  heroIndex: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: "#AFC0B2",
  },

  heroStatusTitle: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#FFFFFF",
  },

  completedHeroTitle: {
    color: "#31513B",
  },

  cancelledHeroTitle: {
    color: "#554C44",
  },

  heroStatusText: {
    marginTop: 9,
    fontSize: 11,
    lineHeight: 17,
    color: "#D0D8D1",
  },

  completedHeroText: {
    color: "#6D7C70",
  },

  cancelledHeroText: {
    color: "#776D62",
  },

  searchingRow: {
    marginTop: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  searchingText: {
    marginLeft: 8,
    fontSize: 9.5,
    fontWeight: "700",
    color: "#C7D3CA",
  },

  progressCard: {
    marginTop: 14,
    padding: 16,
    borderRadius: 26,
    backgroundColor: "#F2F3EE",
    borderWidth: 1,
    borderColor: "#DCE1D9",
  },

  progressStep: {
    minHeight: 34,
    flexDirection: "row",
  },

  progressLeft: {
    width: 24,
    alignItems: "center",
  },

  progressCircle: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#E1E5DE",
    alignItems: "center",
    justifyContent: "center",
  },

  progressCircleActive: {
    backgroundColor: "#5C7260",
  },

  progressInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#A5ADA6",
  },

  progressInnerActive: {
    backgroundColor: "#FFFFFF",
  },

  progressCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  progressLine: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: "#E0E4DE",
  },

  progressLineActive: {
    backgroundColor: "#5C7260",
  },

  progressLabel: {
    marginLeft: 10,
    paddingTop: 1,
    fontSize: 10.5,
    fontWeight: "600",
    color: "#8A918B",
  },

  progressLabelActive: {
    color: "#293229",
    fontWeight: "900",
  },

  sectionTitleWrap: {
    marginTop: 31,
    marginBottom: 12,
  },

  sectionEyebrow: {
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#969C96",
  },

  sectionTitle: {
    marginTop: 4,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.35,
    color: "#292E29",
  },

  helpCard: {
    padding: 15,
    borderRadius: 28,
    backgroundColor: "#EEF3ED",
    borderWidth: 1,
    borderColor: "#D6DED4",
    flexDirection: "row",
    alignItems: "center",
  },

  helpImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DCE5D9",
  },

  helpInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#D8E5D5",
    alignItems: "center",
    justifyContent: "center",
  },

  helpInitialText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#55705A",
  },

  helpInfo: {
    flex: 1,
    marginLeft: 11,
    paddingRight: 6,
  },

  helpNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },

  helpName: {
    fontSize: 14,
    fontWeight: "900",
    color: "#293129",
  },

  verifiedPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: "#D9E6D7",
  },

  verifiedPillText: {
    fontSize: 6.8,
    fontWeight: "900",
    color: "#55705A",
  },

  helpArea: {
    marginTop: 4,
    fontSize: 9.5,
    color: "#79827A",
  },

  travelText: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: "800",
    color: "#5C7160",
  },

  callButton: {
    width: 47,
    height: 47,
    borderRadius: 17,
    backgroundColor: "#DCE7D9",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  callIcon: {
    fontSize: 16,
    color: "#56705A",
  },

  callText: {
    marginTop: 1,
    fontSize: 6.8,
    fontWeight: "900",
    color: "#56705A",
  },

  otpCard: {
    padding: 17,
    borderRadius: 22,
    backgroundColor: "#F0F4ED",
    borderWidth: 1,
    borderColor: "#D7E1D5",
  },

  otpTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  otpIconBox: {
    width: 41,
    height: 41,
    borderRadius: 14,
    backgroundColor: "#DCE7D9",
    alignItems: "center",
    justifyContent: "center",
  },

  otpIcon: {
    fontSize: 18,
    fontWeight: "900",
    color: "#526957",
  },

  otpCopy: {
    flex: 1,
    marginLeft: 10,
  },

  otpTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#2C342D",
  },

  otpSubtitle: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#748074",
  },

  otpValue: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
    color: "#283329",
  },

  timerCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#253A30",
    alignItems: "center",
  },

  timerEyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#AFC1B4",
  },

  timerValue: {
    marginTop: 7,
    fontSize: 39,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#FFFFFF",
  },

  timerValueFinished: {
    color: "#D4E4D5",
  },

  timerTrack: {
    width: "100%",
    height: 7,
    marginTop: 15,
    borderRadius: 4,
    backgroundColor: "#3A4B41",
    overflow: "hidden",
  },

  timerFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#91B299",
  },

  timerSubtext: {
    marginTop: 9,
    fontSize: 9.5,
    color: "#C6D1C9",
  },

  extraTimeCard: {
    padding: 16,
    borderRadius: 21,
    backgroundColor: "#F6F3EB",
    borderWidth: 1,
    borderColor: "#E2DBCD",
  },

  extraTimeTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#383C36",
  },

  extraTimeText: {
    marginTop: 5,
    fontSize: 10,
    lineHeight: 15,
    color: "#7F827A",
  },

  extraButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
  },

  extraButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#E3EADF",
    borderWidth: 1,
    borderColor: "#CFD9CE",
    alignItems: "center",
    justifyContent: "center",
  },

  extraButtonDisabled: {
    backgroundColor: "#ECECE7",
    borderColor: "#E1E2DC",
  },

  extraButtonText: {
    fontSize: 9.5,
    fontWeight: "900",
    color: "#536655",
  },

  extraButtonTextDisabled: {
    color: "#999E98",
  },

  pendingRow: {
    marginTop: 12,
    padding: 10,
    borderRadius: 13,
    backgroundColor: "#ECEFE8",
    flexDirection: "row",
    alignItems: "center",
  },

  pendingText: {
    marginLeft: 8,
    fontSize: 9.5,
    fontWeight: "800",
    color: "#667067",
  },

  lockedPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: "#E7E6DF",
  },

  lockedPillText: {
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: "#8B8F88",
  },

  extraError: {
    marginTop: 9,
    fontSize: 9.5,
    lineHeight: 14,
    color: "#A45A4E",
  },

  detailsCard: {
    paddingHorizontal: 15,
    borderRadius: 21,
    backgroundColor: "#F8F8F4",
    borderWidth: 1,
    borderColor: "#DDE1DA",
  },

  detailRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
  },

  detailLabel: {
    width: 92,
    fontSize: 9,
    fontWeight: "800",
    color: "#929991",
  },

  detailValue: {
    flex: 1,
    paddingLeft: 8,
    fontSize: 10.5,
    lineHeight: 15,
    textAlign: "right",
    fontWeight: "800",
    color: "#313731",
  },

  detailDivider: {
    height: 1,
    backgroundColor: "#E7E9E3",
  },

  infoCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#ECEFE7",
    borderWidth: 1,
    borderColor: "#DCE2D8",
    flexDirection: "row",
  },

  infoCardSuccess: {
    backgroundColor: "#E8F0E6",
    borderColor: "#D1DFD0",
  },

  infoBadge: {
    width: 31,
    height: 31,
    borderRadius: 12,
    backgroundColor: "#D8E3D5",
    alignItems: "center",
    justifyContent: "center",
  },

  infoBadgeSuccess: {
    backgroundColor: "#D3E4D2",
  },

  infoBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#5D7161",
  },

  infoBadgeTextSuccess: {
    color: "#4F6A55",
  },

  infoCopy: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#465548",
  },

  infoText: {
    marginTop: 4,
    fontSize: 9.5,
    lineHeight: 15,
    color: "#727D73",
  },

  cancelArea: {
    marginTop: 22,
    alignItems: "center",
  },

  cancelHint: {
    marginBottom: 8,
    fontSize: 8.5,
    color: "#949A94",
  },

  cancelButton: {
    minWidth: 150,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: "#F3EAE5",
    borderWidth: 1,
    borderColor: "#E4D2CB",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelButtonText: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#9B554A",
  },

  lockedCancel: {
    marginTop: 22,
    padding: 13,
    borderRadius: 17,
    backgroundColor: "#ECEDE8",
    borderWidth: 1,
    borderColor: "#E0E2DC",
  },

  lockedCancelTitle: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#6F756F",
  },

  lockedCancelText: {
    marginTop: 4,
    fontSize: 9,
    lineHeight: 14,
    color: "#8B918B",
  },

  errorCard: {
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8EDEA",
    borderWidth: 1,
    borderColor: "#E9D4CF",
  },

  errorText: {
    fontSize: 9.5,
    lineHeight: 14,
    color: "#8D5147",
  },

  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F8F7F3",
  },

  loadingLogo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#202420",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingRoof: {
    position: "absolute",
    width: 18,
    height: 18,
    borderLeftWidth: 2.5,
    borderTopWidth: 2.5,
    borderColor: "#F8F7F3",
    transform: [{ rotate: "45deg" }],
    top: 10,
  },

  loadingHouse: {
    width: 17,
    height: 13,
    borderWidth: 2.5,
    borderTopWidth: 0,
    borderColor: "#F8F7F3",
    marginTop: 10,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 11,
    color: "#7B827B",
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#2A2F2A",
    textAlign: "center",
  },

  primaryButton: {
    marginTop: 18,
    minWidth: 145,
    height: 45,
    borderRadius: 23,
    backgroundColor: "#5D7161",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(24,28,24,0.42)",
    justifyContent: "flex-end",
  },

  cancelSheet: {
    paddingHorizontal: 20,
    paddingTop: 9,
    paddingBottom: 25,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#F8F7F3",
  },

  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CDD2CA",
  },

  sheetEyebrow: {
    marginTop: 18,
    fontSize: 7.5,
    fontWeight: "900",
    letterSpacing: 1.8,
    color: "#9A9F99",
  },

  sheetTitle: {
    marginTop: 5,
    fontSize: 20,
    fontWeight: "900",
    color: "#292E29",
  },

  sheetSubtitle: {
    marginTop: 5,
    marginBottom: 14,
    fontSize: 10.5,
    color: "#7E857E",
  },

  reasonOption: {
    minHeight: 45,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E0E3DC",
    backgroundColor: "#FBFAF6",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  reasonSelected: {
    borderColor: "#8EA590",
    backgroundColor: "#EDF3EB",
  },

  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#AEB5AD",
    alignItems: "center",
    justifyContent: "center",
  },

  radioSelected: {
    borderColor: "#5D7161",
  },

  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#5D7161",
  },

  reasonText: {
    marginLeft: 10,
    fontSize: 10.5,
    fontWeight: "700",
    color: "#363C36",
  },

  confirmCancel: {
    marginTop: 9,
    height: 50,
    borderRadius: 17,
    backgroundColor: "#A25A4D",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmCancelText: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  disabledButton: {
    opacity: 0.45,
  },

  keepButton: {
    marginTop: 8,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  keepButtonText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#555D55",
  },
});
