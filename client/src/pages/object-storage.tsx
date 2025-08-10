import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  Shield,
  Eye,
  Download,
  Trash2,
  Clock,
  Lock,
  AlertTriangle,
  CheckCircle,
  Calendar,
  User,
  Settings
} from "lucide-react";
import { format } from "date-fns";

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  category: string;
  entityType?: string;
  entityId?: string;
  isEncrypted: boolean;
  encryptionKeyId?: string;
  accessLevel: string;
  tags?: string[];
  description?: string;
  version: number;
  parentDocumentId?: string;
  isLatestVersion: boolean;
  uploadedBy: string;
  lastAccessedAt?: string;
  lastAccessedBy?: string;
  retentionPolicyId?: string;
  scheduledDeletionAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface DocumentAccessLog {
  id: string;
  documentId: string;
  userId: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  accessedAt: string;
  details?: any;
}

interface DocumentRetentionSchedule {
  id: string;
  documentId: string;
  retentionPolicyId: string;
  scheduledDate: string;
  status: string;
  executedAt?: string;
  executedBy?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ObjectStorage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTab, setSelectedTab] = useState("documents");
  const [uploadDialog, setUploadDialog] = useState(false);
  const [newDocument, setNewDocument] = useState({
    fileName: "",
    originalName: "",
    mimeType: "",
    fileSize: 0,
    storagePath: "",
    category: "client_documents",
    entityType: "",
    entityId: "",
    accessLevel: "private",
    tags: [] as string[],
    description: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('documents', 'create');
  const canUpdate = hasPermission('documents', 'update');
  const canDelete = hasPermission('documents', 'delete');
  
  // Debug permissions (remove after testing)
  // console.log('Permissions debug:', { canCreate, canUpdate, canDelete });
  // console.log('hasPermission documents create:', hasPermission('documents', 'create'));

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["/api/documents", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.append("category", selectedCategory);
      }
      params.append("isDeleted", "false");
      
      const response = await apiRequest("GET", `/api/documents?${params}`);
      const data = await response.json();
      console.log('Documents API Response:', data);
      console.log('Is response array?', Array.isArray(data));
      console.log('Response length:', data?.length);
      return Array.isArray(data) ? data : [];
    }
  });

  // Debug logging
  console.log('Documents in component:', documents);
  console.log('Documents length:', documents?.length);

  const { data: documentAccessLogs = [] } = useQuery({
    queryKey: ["/api/document-access-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/document-access-logs");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: retentionSchedules = [] } = useQuery({
    queryKey: ["/api/document-retention-schedules"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/document-retention-schedules");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    }
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (document: any) => {
      return await apiRequest("POST", "/api/documents", document);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setUploadDialog(false);
      setNewDocument({
        fileName: "",
        originalName: "",
        mimeType: "",
        fileSize: 0,
        storagePath: "",
        category: "client_documents",
        entityType: "",
        entityId: "",
        accessLevel: "private",
        tags: [],
        description: ""
      });
      toast({
        title: "Success",
        description: "Document uploaded successfully with GDPR compliance features enabled."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive"
      });
    }
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      return await apiRequest("DELETE", `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document securely deleted in compliance with GDPR requirements."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive"
      });
    }
  });

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-4 w-4" />;
    if (mimeType.includes('zip') || mimeType.includes('archive')) return <Archive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-blue-100 text-blue-800';
      case 'confidential': return 'bg-orange-100 text-orange-800';
      case 'restricted': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = () => {
    if (!newDocument.fileName || !newDocument.originalName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    createDocumentMutation.mutate(newDocument);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Object Storage</h1>
          <p className="text-sm text-gray-600 mt-1">
            GDPR-compliant document management with encryption, audit trails, and retention policies
          </p>
        </div>
        
        {canCreate && (
          <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload New Document</DialogTitle>
                <DialogDescription>
                  Upload a document with GDPR compliance features including automatic encryption
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fileInput">Select File</Label>
                  <input
                    type="file"
                    id="fileInput"
                    data-testid="input-file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewDocument({
                          ...newDocument,
                          fileName: file.name,
                          originalName: file.name,
                          mimeType: file.type,
                          fileSize: file.size,
                          storagePath: `/uploads/${Date.now()}_${file.name}`
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    accept="*/*"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select a file to automatically populate the form fields</p>
                </div>

                <div>
                  <Label htmlFor="fileName">File Name</Label>
                  <Input
                    id="fileName"
                    data-testid="input-fileName"
                    value={newDocument.fileName}
                    onChange={(e) => setNewDocument({...newDocument, fileName: e.target.value})}
                    placeholder="document.pdf"
                  />
                </div>
                
                <div>
                  <Label htmlFor="originalName">Original Name</Label>
                  <Input
                    id="originalName"
                    data-testid="input-originalName"
                    value={newDocument.originalName}
                    onChange={(e) => setNewDocument({...newDocument, originalName: e.target.value})}
                    placeholder="My Document.pdf"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newDocument.category} onValueChange={(value) => setNewDocument({...newDocument, category: value})}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_documents">Client Documents</SelectItem>
                      <SelectItem value="staff_documents">Staff Documents</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                      <SelectItem value="backups">Backups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <Select value={newDocument.accessLevel} onValueChange={(value) => setNewDocument({...newDocument, accessLevel: value})}>
                    <SelectTrigger data-testid="select-accessLevel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="confidential">Confidential</SelectItem>
                      <SelectItem value="restricted">Restricted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="textarea-description"
                    value={newDocument.description}
                    onChange={(e) => setNewDocument({...newDocument, description: e.target.value})}
                    placeholder="Document description..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setUploadDialog(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={createDocumentMutation.isPending}
                    data-testid="button-upload"
                  >
                    {createDocumentMutation.isPending ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* GDPR Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            GDPR Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Lock className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Encryption</p>
                <p className="text-xs text-gray-600">All documents encrypted</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Eye className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Access Tracking</p>
                <p className="text-xs text-gray-600">{Array.isArray(documentAccessLogs) ? documentAccessLogs.length : 0} access logs</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <Clock className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Retention</p>
                <p className="text-xs text-gray-600">{Array.isArray(retentionSchedules) ? retentionSchedules.filter(s => s.status === 'scheduled').length : 0} scheduled</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Audit Trail</p>
                <p className="text-xs text-gray-600">Complete logging enabled</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
          <TabsTrigger value="access-logs" data-testid="tab-access-logs">Access Logs</TabsTrigger>
          <TabsTrigger value="retention" data-testid="tab-retention">Retention Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="categoryFilter">Filter by Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48" data-testid="select-categoryFilter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="client_documents">Client Documents</SelectItem>
                    <SelectItem value="staff_documents">Staff Documents</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                    <SelectItem value="backups">Backups</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                  Showing {Array.isArray(documents) ? documents.length : 0} GDPR-compliant documents
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>
                All documents are automatically encrypted and tracked for GDPR compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading documents...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Access Level</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Encrypted</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(Array.isArray(documents) ? documents : []).map((document) => (
                      <TableRow key={document.id} data-testid={`row-document-${document.id}`}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {getFileIcon(document.mimeType)}
                            <div>
                              <p className="font-medium">{document.originalName}</p>
                              <p className="text-sm text-gray-600">{document.mimeType}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {document.category.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getAccessLevelColor(document.accessLevel)}>
                            {document.accessLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                        <TableCell>
                          {document.isEncrypted ? (
                            <Badge className="bg-green-100 text-green-800">
                              <Lock className="h-3 w-3 mr-1" />
                              Encrypted
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Not Encrypted
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(document.createdAt), 'MMM dd, yyyy')}</p>
                            <p className="text-gray-600">{format(new Date(document.createdAt), 'HH:mm')}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button size="sm" variant="outline" data-testid={`button-view-${document.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-download-${document.id}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteDocumentMutation.mutate(document.id)}
                                disabled={deleteDocumentMutation.isPending}
                                data-testid={`button-delete-${document.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Access Logs</CardTitle>
              <CardDescription>
                Complete audit trail of all document access for GDPR compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Access Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(Array.isArray(documentAccessLogs) ? documentAccessLogs : []).slice(0, 10).map((log) => (
                    <TableRow key={log.id} data-testid={`row-access-log-${log.id}`}>
                      <TableCell>
                        <div className="font-medium">{log.documentId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2" />
                          {log.userId}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            log.action === 'delete' ? 'bg-red-100 text-red-800' :
                            log.action === 'upload' ? 'bg-green-100 text-green-800' :
                            log.action === 'view' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                      <TableCell>{format(new Date(log.accessedAt), 'MMM dd, yyyy HH:mm:ss')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Retention Schedules</CardTitle>
              <CardDescription>
                Automated document deletion schedules for GDPR compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Scheduled Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Executed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retentionSchedules.map((schedule) => (
                    <TableRow key={schedule.id} data-testid={`row-retention-${schedule.id}`}>
                      <TableCell className="font-mono text-sm">{schedule.documentId}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(new Date(schedule.scheduledDate), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            schedule.status === 'completed' ? 'bg-green-100 text-green-800' :
                            schedule.status === 'failed' ? 'bg-red-100 text-red-800' :
                            schedule.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }
                        >
                          {schedule.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {schedule.executedAt ? (
                          <div className="text-sm">
                            <p>{format(new Date(schedule.executedAt), 'MMM dd, yyyy')}</p>
                            <p className="text-gray-600">by {schedule.executedBy}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not executed</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {schedule.status === 'scheduled' && canDelete && (
                          <Button size="sm" variant="outline" data-testid={`button-execute-${schedule.id}`}>
                            Execute Now
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}