"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeTokens, useTheme } from "../theme/ThemeContext";
import { useTestimonials, useClientTestimonials } from "../hooks/useTestimonials";
import { Testimonial } from "../lib/api/endpoints/testimonials";
import { Picker } from "@react-native-picker/picker";
import { TestimonialCard, TestimonialDetailModal } from "./testimonials";

interface TestimonialsPanelProps {
  clientId?: string;
  onAddTestimonial?: () => void;
}

export default function TestimonialsPanel({ clientId, onAddTestimonial }: TestimonialsPanelProps) {
  const { tokens } = useTheme();
  const styles = React.useMemo(() => createStyles(tokens), [tokens]);

  // Use appropriate hook based on whether clientId is provided
  const {
    testimonials,
    loading,
    error,
    approveTestimonial,
    rejectTestimonial,
    toggleFeatured,
    toggleVisibility,
    deleteTestimonial,
    updateTestimonial,
    batchApprove,
    batchReject,
    batchDelete,
    mutating,
  } = clientId
    ? { ...useClientTestimonials(clientId), approveTestimonial: async () => false, rejectTestimonial: async () => false, toggleFeatured: async () => false, toggleVisibility: async () => false, deleteTestimonial: async () => false, updateTestimonial: async () => false, batchApprove: async () => false, batchReject: async () => false, batchDelete: async () => false, mutating: false }
    : useTestimonials();

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date_desc");

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail modal state
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate list when testimonials load
  useEffect(() => {
    if (!loading && testimonials.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, testimonials, fadeAnim]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Handle selection
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle batch actions
  const handleBatchApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const success = await batchApprove(Array.from(selectedIds));
    if (success) {
      Alert.alert("Success", `${selectedIds.size} testimonials approved`);
      setSelectedIds(new Set());
      setSelectionMode(false);
    } else {
      Alert.alert("Error", "Failed to approve testimonials");
    }
  }, [selectedIds, batchApprove]);

  const handleBatchReject = useCallback(async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Reject Testimonials",
      `Are you sure you want to reject ${selectedIds.size} testimonials?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            const success = await batchReject(Array.from(selectedIds));
            if (success) {
              Alert.alert("Success", `${selectedIds.size} testimonials rejected`);
              setSelectedIds(new Set());
              setSelectionMode(false);
            } else {
              Alert.alert("Error", "Failed to reject testimonials");
            }
          },
        },
      ]
    );
  }, [selectedIds, batchReject]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      "Delete Testimonials",
      `Are you sure you want to delete ${selectedIds.size} testimonials? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await batchDelete(Array.from(selectedIds));
            if (success) {
              Alert.alert("Success", `${selectedIds.size} testimonials deleted`);
              setSelectedIds(new Set());
              setSelectionMode(false);
            } else {
              Alert.alert("Error", "Failed to delete testimonials");
            }
          },
        },
      ]
    );
  }, [selectedIds, batchDelete]);

  // Handle individual actions
  const handleApprove = useCallback(
    async (id: string) => {
      const success = await approveTestimonial(id);
      if (!success) {
        Alert.alert("Error", "Failed to approve testimonial");
      }
    },
    [approveTestimonial]
  );

  const handleReject = useCallback(
    async (id: string) => {
      Alert.alert(
        "Reject Testimonial",
        "Are you sure you want to reject this testimonial?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              const success = await rejectTestimonial(id);
              if (!success) {
                Alert.alert("Error", "Failed to reject testimonial");
              }
            },
          },
        ]
      );
    },
    [rejectTestimonial]
  );

  const handleToggleFeatured = useCallback(
    async (id: string, isFeatured: boolean) => {
      const success = await toggleFeatured(id, isFeatured);
      if (!success) {
        Alert.alert("Error", "Failed to update featured status");
      }
    },
    [toggleFeatured]
  );

  const handleToggleVisibility = useCallback(
    async (id: string, isPublic: boolean) => {
      const success = await toggleVisibility(id, isPublic);
      if (!success) {
        Alert.alert("Error", "Failed to update visibility");
      }
    },
    [toggleVisibility]
  );

  // Handle card press - open detail modal
  const handleCardPress = useCallback((testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setShowDetailModal(true);
  }, []);

  // Filter and sort testimonials
  const filteredTestimonials = useMemo(() => {
    let filtered = [...testimonials];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.client?.name?.toLowerCase().includes(query) ||
          t.content?.toLowerCase().includes(query) ||
          t.title?.toLowerCase().includes(query) ||
          t.serviceName?.toLowerCase().includes(query) ||
          t.client?.company?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Rating filter
    if (ratingFilter > 0) {
      filtered = filtered.filter((t) => t.rating === ratingFilter);
    }

    // Visibility filter
    if (visibilityFilter === "public") {
      filtered = filtered.filter((t) => t.isPublic);
    } else if (visibilityFilter === "private") {
      filtered = filtered.filter((t) => !t.isPublic);
    } else if (visibilityFilter === "featured") {
      filtered = filtered.filter((t) => t.isFeatured);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date_desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date_asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "rating_desc":
          return b.rating - a.rating;
        case "rating_asc":
          return a.rating - b.rating;
        case "client_asc":
          return (a.client?.name || "").localeCompare(b.client?.name || "");
        case "client_desc":
          return (b.client?.name || "").localeCompare(a.client?.name || "");
        default:
          return 0;
      }
    });

    return filtered;
  }, [testimonials, searchQuery, statusFilter, ratingFilter, visibilityFilter, sortBy]);

  // Generate dynamic header
  const getDynamicHeader = () => {
    const filters = [];

    if (statusFilter !== "all") {
      const statusLabels: Record<string, string> = {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
      };
      filters.push(statusLabels[statusFilter]);
    }

    if (ratingFilter > 0) {
      filters.push(`${ratingFilter}-Star`);
    }

    if (visibilityFilter !== "all") {
      const visibilityLabels: Record<string, string> = {
        public: "Public",
        private: "Private",
        featured: "Featured",
      };
      filters.push(visibilityLabels[visibilityFilter]);
    }

    if (searchQuery) {
      filters.push("Searched");
    }

    if (filters.length === 0) {
      return "All Testimonials";
    }

    return `${filters.join(" ")} Testimonials`;
  };

  // Get pending count for batch action display
  const pendingCount = useMemo(
    () => filteredTestimonials.filter((t) => t.status === "PENDING").length,
    [filteredTestimonials]
  );

  if (loading) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Testimonials</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={tokens.accent} />
          <Text style={[styles.loadingText, { color: tokens.textSecondary }]}>
            Loading testimonials...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.panel}>
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Testimonials</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={24} color={tokens.textSecondary} />
          <Text style={[styles.errorText, { color: tokens.textSecondary }]}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>Testimonials</Text>
        {onAddTestimonial && (
          <TouchableOpacity onPress={onAddTestimonial}>
            <Text style={styles.cta}>Add testimonial</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={tokens.textSecondary} style={{ position: 'absolute', left: 12, top: 12, zIndex: 1 }} />
        <TextInput
          style={[styles.searchInput, { color: tokens.textPrimary, borderColor: tokens.accent }]}
          placeholder="Search testimonials..."
          placeholderTextColor={tokens.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>STATUS</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={(itemValue) => setStatusFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All Statuses" value="all" />
                <Picker.Item label="Pending" value="PENDING" />
                <Picker.Item label="Approved" value="APPROVED" />
                <Picker.Item label="Rejected" value="REJECTED" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>RATING</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={ratingFilter}
                onValueChange={(itemValue) => setRatingFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All Ratings" value={0} />
                <Picker.Item label="5 Stars" value={5} />
                <Picker.Item label="4 Stars" value={4} />
                <Picker.Item label="3 Stars" value={3} />
                <Picker.Item label="2 Stars" value={2} />
                <Picker.Item label="1 Star" value={1} />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>VISIBILITY</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={visibilityFilter}
                onValueChange={(itemValue) => setVisibilityFilter(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="All" value="all" />
                <Picker.Item label="Public Only" value="public" />
                <Picker.Item label="Private Only" value="private" />
                <Picker.Item label="Featured Only" value="featured" />
              </Picker>
            </View>
          </View>

          <View style={styles.filterItem}>
            <Text style={[styles.filterLabel, { color: tokens.textSecondary }]}>SORT BY</Text>
            <View style={[styles.pickerContainer, { borderColor: tokens.accent }]}>
              <Picker
                selectedValue={sortBy}
                onValueChange={(itemValue) => setSortBy(itemValue)}
                style={[styles.picker, { color: tokens.textPrimary }]}
                dropdownIconColor={tokens.accent}
              >
                <Picker.Item label="Newest First" value="date_desc" />
                <Picker.Item label="Oldest First" value="date_asc" />
                <Picker.Item label="Highest Rated" value="rating_desc" />
                <Picker.Item label="Lowest Rated" value="rating_asc" />
                <Picker.Item label="Client A-Z" value="client_asc" />
                <Picker.Item label="Client Z-A" value="client_desc" />
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.clearButton, { backgroundColor: tokens.accent }]}
            onPress={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setRatingFilter(0);
              setVisibilityFilter("all");
              setSortBy("date_desc");
            }}
          >
            <Text style={styles.clearButtonText}>CLEAR FILTERS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectModeButton,
              selectionMode && styles.selectModeButtonActive,
              { borderColor: tokens.accent },
            ]}
            onPress={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedIds(new Set());
              }
            }}
          >
            <Ionicons
              name={selectionMode ? "checkbox" : "checkbox-outline"}
              size={16}
              color={selectionMode ? "#fff" : tokens.accent}
            />
            <Text
              style={[
                styles.selectModeButtonText,
                { color: selectionMode ? "#fff" : tokens.accent },
              ]}
            >
              SELECT
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Batch action bar */}
      {selectionMode && selectedIds.size > 0 && (
        <View style={[styles.batchActionBar, { backgroundColor: tokens.surface }]}>
          <Text style={[styles.selectedCount, { color: tokens.textPrimary }]}>
            {selectedIds.size} selected
          </Text>
          <View style={styles.batchActions}>
            <TouchableOpacity
              style={styles.batchActionButton}
              onPress={handleBatchApprove}
              disabled={mutating}
            >
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.batchActionButton}
              onPress={handleBatchReject}
              disabled={mutating}
            >
              <Ionicons name="close-circle" size={20} color="#f59e0b" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.batchActionButton}
              onPress={handleBatchDelete}
              disabled={mutating}
            >
              <Ionicons name="trash" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Dynamic Header */}
      <View style={styles.dynamicHeaderRow}>
        <Text style={[styles.dynamicHeader, { color: tokens.textPrimary }]}>
          {getDynamicHeader()}
        </Text>
        <Text style={[styles.resultCount, { color: tokens.textSecondary }]}>
          {filteredTestimonials.length} {filteredTestimonials.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {filteredTestimonials.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={32} color={tokens.textSecondary} />
          <Text style={[styles.emptyText, { color: tokens.textSecondary }]}>
            {searchQuery ||
            statusFilter !== "all" ||
            ratingFilter > 0 ||
            visibilityFilter !== "all"
              ? "No testimonials match your filters"
              : "No testimonials yet"}
          </Text>
        </View>
      ) : (
        <Animated.View style={{ opacity: fadeAnim }}>
          {filteredTestimonials.map((testimonial) => (
            <TestimonialCard
              key={testimonial.id}
              testimonial={testimonial}
              onPress={() => handleCardPress(testimonial)}
              onApprove={() => handleApprove(testimonial.id)}
              onReject={() => handleReject(testimonial.id)}
              onToggleFeatured={(isFeatured) =>
                handleToggleFeatured(testimonial.id, isFeatured)
              }
              onToggleVisibility={(isPublic) =>
                handleToggleVisibility(testimonial.id, isPublic)
              }
              isSelected={selectedIds.has(testimonial.id)}
              onToggleSelect={() => handleToggleSelect(testimonial.id)}
              selectionMode={selectionMode}
              disabled={mutating}
            />
          ))}
        </Animated.View>
      )}

      {/* Testimonial Detail Modal */}
      <TestimonialDetailModal
        visible={showDetailModal}
        testimonial={selectedTestimonial}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTestimonial(null);
        }}
        onApprove={approveTestimonial}
        onReject={rejectTestimonial}
        onToggleFeatured={toggleFeatured}
        onToggleVisibility={toggleVisibility}
        onUpdate={updateTestimonial}
        onDelete={deleteTestimonial}
      />
    </View>
  );
}

const createStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    panel: {
      width: '100%',
      alignSelf: 'stretch',
    },
    headingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    heading: {
      fontSize: 16,
      fontFamily: 'Bytesized-Regular',
      fontWeight: "700",
      color: tokens.textPrimary,
    },
    cta: {
      color: tokens.accent,
      fontFamily: 'lores-9-wide',
      textTransform: "uppercase",
      fontSize: 12,
      fontWeight: "600",
    },
    searchContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    searchIcon: {
      position: 'absolute',
      left: 12,
      top: 12,
      zIndex: 1,
    },
    searchInput: {
      fontFamily: 'lores-9-wide',
      fontSize: 13,
      paddingLeft: 36,
      paddingRight: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderRadius: 4,
      backgroundColor: tokens.background,
    },
    filtersContainer: {
      marginBottom: 16,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    filterItem: {
      flex: 1,
    },
    filterLabel: {
      fontFamily: 'lores-9-wide',
      fontSize: 10,
      fontWeight: '700',
      marginBottom: 4,
    },
    pickerContainer: {
      borderWidth: 1,
      borderRadius: 4,
      backgroundColor: tokens.background,
    },
    picker: {
      fontFamily: 'lores-9-wide',
      fontSize: 12,
      height: 40,
    },
    clearButton: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 4,
      height: 40,
    },
    clearButtonText: {
      fontFamily: "lores-9-wide",
      fontSize: 11,
      fontWeight: "700",
      color: "#000",
    },
    selectModeButton: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 4,
      height: 40,
      borderWidth: 1,
      gap: 6,
      marginLeft: 8,
    },
    selectModeButtonActive: {
      backgroundColor: tokens.accent,
    },
    selectModeButtonText: {
      fontFamily: "lores-9-wide",
      fontSize: 11,
      fontWeight: "700",
    },
    batchActionBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      marginBottom: 12,
    },
    selectedCount: {
      fontSize: 13,
      fontFamily: "lores-9-wide",
      fontWeight: "600",
    },
    batchActions: {
      flexDirection: "row",
      gap: 16,
    },
    batchActionButton: {
      padding: 8,
    },
    dynamicHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: tokens.accent + '30',
    },
    dynamicHeader: {
      fontSize: 14,
      fontFamily: 'Bytesized-Regular',
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    resultCount: {
      fontSize: 11,
      fontFamily: "lores-9-wide",
    },
    centerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 24,
      gap: 8,
    },
    loadingText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'lores-9-wide',
      textAlign: 'center',
      marginTop: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 32,
      gap: 12,
    },
    emptyText: {
      fontSize: 14,
      fontFamily: 'lores-9-wide',
    },
  });
