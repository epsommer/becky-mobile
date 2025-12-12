/**
 * LocationAutocomplete - Custom Google Places Autocomplete for location input
 * Uses Google Places API directly to avoid VirtualizedLists nesting issues
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { GOOGLE_PLACES_API_KEY } from '@env';

interface PlacePrediction {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
}

interface LocationAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectLocation?: (details: {
    address: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
  }) => void;
  placeholder?: string;
}

const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

export default function LocationAutocomplete({
  value,
  onChangeText,
  onSelectLocation,
  placeholder = 'Add location',
}: LocationAutocompleteProps) {
  const { tokens } = useTheme();
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<string>(generateSessionToken());

  const apiKey = GOOGLE_PLACES_API_KEY || '';

  // Generate a new session token for billing optimization
  function generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  // Fetch place predictions from Google Places API
  const fetchPredictions = useCallback(async (input: string) => {
    if (!apiKey || input.length < 2) {
      setPredictions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `${PLACES_API_URL}/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}&language=en&types=address&sessiontoken=${sessionTokenRef.current}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.predictions) {
        setPredictions(data.predictions);
        setShowSuggestions(true);
      } else {
        setPredictions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Error fetching place predictions:', error);
      setPredictions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  // Fetch place details to get lat/lng
  const fetchPlaceDetails = useCallback(async (placeId: string): Promise<{ lat?: number; lng?: number }> => {
    if (!apiKey) return {};

    try {
      const url = `${PLACES_API_URL}/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}&sessiontoken=${sessionTokenRef.current}`;
      const response = await fetch(url);
      const data = await response.json();

      // Generate new session token after place details request (ends the session)
      sessionTokenRef.current = generateSessionToken();

      if (data.status === 'OK' && data.result?.geometry?.location) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
    }
    return {};
  }, [apiKey]);

  // Handle text input changes with debounce
  const handleTextChange = useCallback((text: string) => {
    onChangeText(text);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  }, [onChangeText, fetchPredictions]);

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(async (prediction: PlacePrediction) => {
    const address = prediction.description;
    onChangeText(address);
    setShowSuggestions(false);
    setPredictions([]);

    if (onSelectLocation) {
      const details = await fetchPlaceDetails(prediction.place_id);
      onSelectLocation({
        address,
        placeId: prediction.place_id,
        latitude: details.lat,
        longitude: details.lng,
      });
    }
  }, [onChangeText, onSelectLocation, fetchPlaceDetails]);

  // Handle blur - dismiss suggestions after a delay to allow selection
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (value.length >= 2 && predictions.length > 0) {
      setShowSuggestions(true);
    }
  }, [value, predictions.length]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!apiKey) {
    // Fallback to simple text input if no API key
    return (
      <View style={styles.fallbackContainer}>
        <TextInput
          style={[styles.input, { color: tokens.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSecondary}
          value={value}
          onChangeText={onChangeText}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: tokens.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSecondary}
          value={value}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {isLoading && (
          <ActivityIndicator size="small" color={tokens.accent} style={styles.loader} />
        )}
      </View>

      {/* Suggestions dropdown - using simple Views instead of FlatList */}
      {showSuggestions && predictions.length > 0 && (
        <View style={[styles.suggestionsContainer, {
          backgroundColor: tokens.surface,
          borderColor: tokens.border,
        }]}>
          {predictions.slice(0, 5).map((prediction, index) => (
            <TouchableOpacity
              key={prediction.place_id}
              style={[
                styles.suggestionRow,
                index < predictions.length - 1 && index < 4 && {
                  borderBottomWidth: 1,
                  borderBottomColor: tokens.border,
                },
              ]}
              onPress={() => handleSelectSuggestion(prediction)}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={16} color={tokens.accent} />
              <View style={styles.suggestionText}>
                <Text style={[styles.suggestionMain, { color: tokens.textPrimary }]} numberOfLines={1}>
                  {prediction.structured_formatting?.main_text || prediction.description}
                </Text>
                {prediction.structured_formatting?.secondary_text && (
                  <Text style={[styles.suggestionSecondary, { color: tokens.textSecondary }]} numberOfLines={1}>
                    {prediction.structured_formatting.secondary_text}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  loader: {
    marginLeft: 8,
  },
  fallbackContainer: {
    flex: 1,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    maxHeight: 250,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '500',
  },
  suggestionSecondary: {
    fontSize: 12,
    marginTop: 2,
  },
});
