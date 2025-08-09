import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { Button, Card, Title, Paragraph } from 'react-native-paper';

interface PhotoUploaderProps {
  onPhotosSelected: (photos: string[]) => void;
  maxPhotos?: number;
}

interface SelectedPhoto {
  uri: string;
  id: string;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotosSelected,
  maxPhotos = 10,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const selectPhotos = () => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8,
      selectionLimit: maxPhotos - selectedPhotos.length,
      includeBase64: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      if (response.assets) {
        const newPhotos = response.assets.map((asset, index) => ({
          uri: asset.uri || '',
          id: `photo_${Date.now()}_${index}`,
        }));

        const updatedPhotos = [...selectedPhotos, ...newPhotos];
        setSelectedPhotos(updatedPhotos);
        onPhotosSelected(updatedPhotos.map(photo => photo.uri));
      }
    });
  };

  const removePhoto = (photoId: string) => {
    const updatedPhotos = selectedPhotos.filter(photo => photo.id !== photoId);
    setSelectedPhotos(updatedPhotos);
    onPhotosSelected(updatedPhotos.map(photo => photo.uri));
  };

  const handleUpload = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo to continue.');
      return;
    }

    setIsUploading(true);
    // Placeholder for upload logic
    setTimeout(() => {
      setIsUploading(false);
      Alert.alert('Success', 'Photos uploaded successfully!');
    }, 2000);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Upload Your Dating Photos</Title>
          <Paragraph style={styles.description}>
            Select 3-10 photos that represent you best. Our AI will analyze each photo
            and recommend the optimal combination for maximum matches.
          </Paragraph>
        </Card.Content>
      </Card>

      <View style={styles.photosContainer}>
        {selectedPhotos.map((photo) => (
          <View key={photo.id} style={styles.photoWrapper}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePhoto(photo.id)}
            >
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {selectedPhotos.length < maxPhotos && (
          <TouchableOpacity style={styles.addPhotoButton} onPress={selectPhotos}>
            <Text style={styles.addPhotoText}>+</Text>
            <Text style={styles.addPhotoSubtext}>Add Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {selectedPhotos.length}/{maxPhotos} photos selected
        </Text>
        {selectedPhotos.length > 0 && (
          <Text style={styles.tipText}>
            💡 Tip: Include a mix of close-ups, full body, and activity photos for best results
          </Text>
        )}
      </View>

      <Button
        mode="contained"
        onPress={handleUpload}
        loading={isUploading}
        disabled={selectedPhotos.length === 0 || isUploading}
        style={styles.uploadButton}
        contentStyle={styles.uploadButtonContent}
      >
        {isUploading ? 'Analyzing Photos...' : 'Continue to Analysis'}
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#e91e63',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  photoWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  photo: {
    width: 100,
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    width: 100,
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e91e63',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  addPhotoText: {
    fontSize: 24,
    color: '#e91e63',
    fontWeight: 'bold',
  },
  addPhotoSubtext: {
    fontSize: 12,
    color: '#e91e63',
    marginTop: 4,
  },
  infoContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  tipText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  uploadButton: {
    margin: 16,
    backgroundColor: '#e91e63',
  },
  uploadButtonContent: {
    paddingVertical: 8,
  },
});

export default PhotoUploader;