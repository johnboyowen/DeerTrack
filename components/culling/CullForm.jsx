
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";

const PROPERTY_NAMES = [
  "Torrin, Skye",
  "Sconser, Skye",
  "Strathaird, Skye",
  "Nevis",
  "East Schiehallion",
  "Knoydart",
  "Quinag",
  "Sandwood Bay",
  "Glenlude",
  "Kylesku",
  "Thirlmere",
  "Charterhouse Priory",
  "Marsco, Skye"
];

const LEAD_CONTRACTORS = [
  "Drummournie Deer Forest Management (Darrell Robertson 2596)",
  "Environmental and Engineering Solutions Ltd (Michael Stokes 1615)",
  "Alasdair Macaskill 224",
  "David Balharry 247",
  "Scott Speed",
  "Cape Adventures (David Shaw)",
  "Direct Contractor"
];

const ADDITIONAL_STALKERS = [
  "Terence Bain 1967",
  "John A Boyd 225",
  "Kevin Campbell 3584",
  "Ronan Dugan 2934",
  "Iain King 3315",
  "Chris Macdonald 159",
  "Donald Mackay 2488",
  "Stuart Macsween 2097",
  "Mathew Thompson 1507",
  "Alasdair Macaskill 224",
  "Steven McClenaghan 3798",
  "Connor MacIsaac 3831",
  "Jamie Sutherland"
];

const EXEMPTIONS = [
  "None",
  "Out of Season",
  "Night Shooting",
  "Both"
];

const LAND_TYPES = [
  "Enclosed Woodland",
  "Enclosed Agriculture",
  "Open Range"
];

const MATURITY_OPTIONS = ["Stag", "Hind", "Calf"];
const SPECIES_OPTIONS = ["Red", "Sika", "Roe", "Fallow", "Muntjac"];
const CARCASS_FATE_OPTIONS = ["Extracted", "Hill Butchered", "Left"];

export default function CullForm({ onSubmit, submitting }) {
  const [formData, setFormData] = useState({
    property_name: "",
    lead_contractor: "",
    additional_stalkers: "",
    exemptions: "",
    land_type: "",
    maturity: "",
    species: "",
    carcass_fate: "",
    notes: "",
    photo_url: ""
  });
  
  const [selectedStalkers, setSelectedStalkers] = useState([]);
  const [showStalkerDropdown, setShowStalkerDropdown] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const stalkerDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (stalkerDropdownRef.current && !stalkerDropdownRef.current.contains(event.target)) {
        setShowStalkerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleStalker = (stalker) => {
    setSelectedStalkers(prev => {
      const isSelected = prev.includes(stalker);
      const newStalkers = isSelected 
        ? prev.filter(s => s !== stalker)
        : [...prev, stalker];
      
      handleChange('additional_stalkers', newStalkers.join(', '));
      return newStalkers;
    });
  };

  const removeStalker = (stalker) => {
    setSelectedStalkers(prev => {
      const newStalkers = prev.filter(s => s !== stalker);
      handleChange('additional_stalkers', newStalkers.join(', '));
      return newStalkers;
    });
  };

  // Compress image before upload
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize to max 1920px on longest side
          const maxSize = 1920;
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with 0.7 quality (reduces file size significantly)
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const startCamera = async () => {
    setShowCamera(true);
    setCameraReady(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Unable to access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    // Compress to 0.7 quality to reduce file size
    canvas.toBlob((blob) => {
      const file = new File([blob], `deer-${Date.now()}.jpg`, { type: 'image/jpeg' });
      handlePhotoFile(file);
      stopCamera();
    }, 'image/jpeg', 0.7);
  };

  const handlePhotoFile = async (file) => {
    // Compress the image before processing
    const compressedFile = await compressImage(file);
    setPhotoFile(compressedFile);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(compressedFile);

    if (navigator.onLine) {
      setUploadingPhoto(true);
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
        handleChange('photo_url', file_url);
        setUploadingPhoto(false);
      } catch (error) {
        console.error("Failed to upload photo:", error);
        setUploadingPhoto(false);
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handlePhotoFile(file);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setPhotoFile(null);
    handleChange('photo_url', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    let photoData = formData.photo_url;
    
    if (!navigator.onLine && photoFile && !formData.photo_url) {
      photoData = photoPreview;
    }
    
    onSubmit({
      ...formData,
      photo_url: photoData,
      _photoFile: photoFile
    });
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const isValid = formData.property_name && formData.lead_contractor && 
                  formData.species && formData.maturity && formData.carcass_fate &&
                  formData.land_type && formData.exemptions && (photoPreview || formData.photo_url);

  const getSelectClassName = (value) => {
    return value 
      ? "bg-green-900 bg-opacity-30 border-green-700 text-white" 
      : "bg-slate-700 border-slate-600 text-white";
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="bg-slate-800 border-slate-700 mb-6">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 mr-2 text-orange-500" />
            Photo <span className="text-red-400">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {!photoPreview ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={startCamera}
                  className="w-full border-gray-300 bg-white text-black hover:bg-gray-100 py-8 text-base font-medium"
                >
                  <Camera className="w-5 h-5 mr-2 text-black" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-gray-300 bg-white text-black hover:bg-gray-100 py-8 text-base font-medium"
                >
                  <Upload className="w-5 h-5 mr-2 text-black" />
                  Upload Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-slate-900">
                <img 
                  src={photoPreview} 
                  alt="Deer" 
                  className="w-full h-64 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 bg-red-600 hover:bg-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              {!navigator.onLine && !uploadingPhoto && (
                <p className="text-sm text-orange-400 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Photo will be uploaded when online
                </p>
              )}
            </div>
          )}

          {showCamera && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col">
              <div className="flex-1 relative bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="p-4 flex gap-3 bg-slate-900">
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCamera}
                  className="flex-1 border-slate-700 bg-white text-black hover:bg-gray-100 h-14 text-base"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 h-14 text-base"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="property_name" className="text-slate-300 text-base">
                Property Name <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.property_name} onValueChange={(value) => handleChange('property_name', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.property_name)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black max-w-[calc(100vw-2rem)]">
                  {PROPERTY_NAMES.map((name) => (
                    <SelectItem key={name} value={name} className="text-black text-lg py-4">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_contractor" className="text-slate-300 text-base">
                Lead Contractor <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.lead_contractor} onValueChange={(value) => handleChange('lead_contractor', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.lead_contractor)} min-h-12 h-auto text-sm w-full py-2`}>
                  <div className="text-left leading-tight whitespace-normal break-words w-full">
                    {formData.lead_contractor || "Select contractor"}
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white text-black max-w-[calc(100vw-2rem)]">
                  {LEAD_CONTRACTORS.map((name) => (
                    <SelectItem key={name} value={name} className="text-black text-base py-4 leading-tight whitespace-normal">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2" ref={stalkerDropdownRef}>
              <Label htmlFor="additional_stalkers" className="text-slate-300 text-base">
                Additional Stalkers (Multiple)
              </Label>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowStalkerDropdown(!showStalkerDropdown)}
                  className={`${getSelectClassName(selectedStalkers.length > 0)} h-12 text-base w-full justify-between overflow-hidden`}
                >
                  <span className="truncate">
                    {selectedStalkers.length === 0 
                      ? 'Select stalkers' 
                      : `${selectedStalkers.length} selected`}
                  </span>
                  <span className="ml-2 flex-shrink-0">▼</span>
                </Button>
                
                {showStalkerDropdown && (
                  <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-slate-300 rounded-lg shadow-lg max-h-80 overflow-auto">
                    {ADDITIONAL_STALKERS.map((stalker) => (
                      <div
                        key={stalker}
                        onClick={() => toggleStalker(stalker)}
                        className={`px-4 py-4 cursor-pointer hover:bg-slate-100 flex items-center gap-3 ${
                          selectedStalkers.includes(stalker) ? 'bg-green-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedStalkers.includes(stalker)}
                          onChange={() => {}}
                          className="w-5 h-5 flex-shrink-0"
                        />
                        <span className="text-black text-base leading-tight">{stalker}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedStalkers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedStalkers.map((stalker) => (
                    <Badge
                      key={stalker}
                      variant="secondary"
                      className="bg-green-900 bg-opacity-30 text-green-300 border-green-700 pr-1 text-sm"
                    >
                      <span className="truncate max-w-[200px]">{stalker}</span>
                      <button
                        type="button"
                        onClick={() => removeStalker(stalker)}
                        className="ml-2 hover:text-white flex-shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="exemptions" className="text-slate-300 text-base">
                Exemptions <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.exemptions} onValueChange={(value) => handleChange('exemptions', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.exemptions)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select exemption" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {EXEMPTIONS.map((exemption) => (
                    <SelectItem key={exemption} value={exemption} className="text-black text-lg py-4">{exemption}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="land_type" className="text-slate-300 text-base">
                Land Type <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.land_type} onValueChange={(value) => handleChange('land_type', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.land_type)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select land type" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {LAND_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="text-black text-lg py-4 leading-tight whitespace-normal">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="species" className="text-slate-300 text-base">
                Species <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.species} onValueChange={(value) => handleChange('species', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.species)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {SPECIES_OPTIONS.map((species) => (
                    <SelectItem key={species} value={species} className="text-black text-lg py-4">{species}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maturity" className="text-slate-300 text-base">
                Maturity <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.maturity} onValueChange={(value) => handleChange('maturity', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.maturity)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select maturity" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {MATURITY_OPTIONS.map((maturity) => (
                    <SelectItem key={maturity} value={maturity} className="text-black text-lg py-4">{maturity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carcass_fate" className="text-slate-300 text-base">
                Carcass Fate <span className="text-red-400">*</span>
              </Label>
              <Select value={formData.carcass_fate} onValueChange={(value) => handleChange('carcass_fate', value)}>
                <SelectTrigger className={`${getSelectClassName(formData.carcass_fate)} h-12 text-base w-full`}>
                  <SelectValue placeholder="Select fate" />
                </SelectTrigger>
                <SelectContent className="bg-white text-black">
                  {CARCASS_FATE_OPTIONS.map((fate) => (
                    <SelectItem key={fate} value={fate} className="text-black text-lg py-4">{fate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-300 text-base">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional observations or notes..."
              className="bg-slate-700 border-slate-600 text-white min-h-24 text-base"
            />
          </div>

          <Button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium text-lg py-6"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Save Cull Record
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}