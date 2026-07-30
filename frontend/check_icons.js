import * as icons from "lucide-react";

const imported = [
  "User", "Mail", "Globe", "Clock", "Calendar", "Database", "FileText", "MessageSquare", "ShieldCheck", "Camera", "Edit3", "Save", "X", "LogOut", "Smartphone", "CheckCircle", "Activity", "AlertTriangle", "Lock", "Eye", "EyeOff", "Trash2", "Download", "Bell", "BellOff", "Settings", "BarChart2", "Archive", "RefreshCw", "Key", "Monitor", "Laptop", "Tablet", "Info", "Link", "Building", "Briefcase", "MapPin", "AtSign", "ChevronRight", "Award", "Zap", "BookOpen", "Sliders", "Shield", "UserCheck", "Package", "HardDrive", "RotateCw", "ZoomIn", "ZoomOut", "Crop"
];

let failed = false;
for (const name of imported) {
    if (!icons[name]) {
        console.log("Missing icon:", name);
        failed = true;
    }
}
if (!failed) console.log("All icons valid.");
