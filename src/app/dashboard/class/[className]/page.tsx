"use client";

import { useState, use, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, RefreshCcw, Pencil, Trash2, Search, FileJson, Copy, Check, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type DataObject = {
    id: string;
    [key: string]: any;
};

type StoredConfig = {
    type: "redis" | "mongodb" | "mysql" | "weaviate";
    url?: string;
    host?: string;
    port?: string;
    protocol?: "http" | "https";
    username?: string;
    apiKey?: string;
    useTls?: boolean;
};

type SessionItem = {
    id: string;
    name: string;
    config: StoredConfig;
};

// Reusable cell with tooltip + click-to-copy
function CopyableCell({ value, maxWidth = 200 }: { value: string; maxWidth?: number }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success("Copied to clipboard", { duration: 1500 });
            setTimeout(() => setCopied(false), 1500);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const displayValue = value.length > 60 ? value.substring(0, 60) + "…" : value;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className="truncate cursor-pointer group/cell flex items-center gap-1.5 hover:text-primary transition-colors"
                    style={{ maxWidth }}
                    onClick={handleCopy}
                >
                    <span className="truncate">{displayValue}</span>
                    {copied ? (
                        <Check className="w-3 h-3 text-green-500 shrink-0 opacity-100" />
                    ) : (
                        <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover/cell:opacity-50 transition-opacity" />
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                align="start"
                className="max-w-sm break-all text-xs font-mono p-3 bg-popover text-popover-foreground border border-border shadow-lg"
            >
                <p className="whitespace-pre-wrap">{value}</p>
                <p className="text-muted-foreground mt-1.5 text-[10px] italic">Click to copy</p>
            </TooltipContent>
        </Tooltip>
    );
}

export default function ClassDataPage({ params }: { params: Promise<{ className: string }> }) {
    const resolvedParams = use(params);
    const className = resolvedParams.className;
    const router = useRouter();

    const [data, setData] = useState<DataObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    // Modals state
    const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
    const [editingObject, setEditingObject] = useState<DataObject | null>(null);
    const [objectToDelete, setObjectToDelete] = useState<string | null>(null);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Form state
    const [propertiesJson, setPropertiesJson] = useState("");

    const getConfig = () => {
        const storedSessions = localStorage.getItem("weaviateSessions");
        const storedActiveId = localStorage.getItem("weaviateActiveSessionId");
        const stored = localStorage.getItem("weaviateConfig");
        if (storedSessions) {
            try {
                const sessions = JSON.parse(storedSessions) as SessionItem[];
                const active = sessions.find((item) => item.id === storedActiveId) || sessions[0];
                if (!active || active.config.type !== "weaviate") {
                    router.push("/");
                    return null;
                }
                return active.config;
            } catch {
                router.push("/");
                return null;
            }
        }
        if (!stored) {
            router.push("/");
            return null;
        }
        const legacy = JSON.parse(stored) as StoredConfig;
        if (legacy.type !== "weaviate") {
            router.push("/");
            return null;
        }
        return legacy;
    };

    const getAuthHeaders = () => {
        const config = getConfig();
        if (!config) return {};
        return {
            "x-weaviate-url": config.url,
            ...(config.apiKey && { "x-weaviate-api-key": config.apiKey })
        };
    };

    const fetchData = useCallback(async (isInitial = false) => {
        if (!isInitial) setIsLoading(true);
        try {
            const config = getConfig();
            if (!config) {
                setIsLoading(false);
                return;
            }
            const offset = (currentPage - 1) * pageSize;
            const queryParams = new URLSearchParams({
                class: className,
                limit: String(pageSize),
                offset: String(offset)
            });
            if (searchQuery) {
                queryParams.set("query", searchQuery);
            }

            const res = await fetch(`/api/weaviate/objects?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!res.ok) throw new Error("Failed to fetch data");
            const json = await res.json();

            if (json.error) throw new Error(json.error);
            setData(json.objects || []);
            setTotalCount(json.totalCount || 0);
            // Clear selection on data refresh
            setSelectedIds(new Set());

            if (!isInitial) toast.success("Data refreshed");
        } catch (error: any) {
            console.error("Fetch error:", error);
            toast.error(error.message || "Failed to load class data");
        } finally {
            setIsLoading(false);
        }
    }, [className, searchQuery, currentPage, pageSize]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // Dynamically derive all property columns from data
    const columns = useMemo(() => {
        const colSet = new Set<string>();
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== "id") colSet.add(key);
            });
        });
        return Array.from(colSet);
    }, [data]);

    // Convert any value to a display string
    const valueToString = (val: any): string => {
        if (val === null || val === undefined) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
    };

    // Selection helpers
    const isAllSelected = data.length > 0 && selectedIds.size === data.length;
    const isSomeSelected = selectedIds.size > 0 && selectedIds.size < data.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(data.map(item => item.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const handleOpenAdd = () => {
        setEditingObject(null);
        setPropertiesJson("{\n  \n}");
        setIsAddEditModalOpen(true);
    };

    const handleOpenEdit = (obj: DataObject) => {
        setEditingObject(obj);
        // Exclude 'id' from formatting properties
        const { id, ...rest } = obj;
        setPropertiesJson(JSON.stringify(rest, null, 2));
        setIsAddEditModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const properties = JSON.parse(propertiesJson);
            setIsLoading(true);

            if (editingObject) {
                // Edit
                const res = await fetch(`/api/weaviate/objects`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        class: className,
                        id: editingObject.id,
                        properties
                    })
                });
                if (!res.ok) throw new Error("Update failed");
                toast.success("Object updated successfully");
            } else {
                // Add
                const res = await fetch(`/api/weaviate/objects`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify({
                        class: className,
                        properties
                    })
                });
                if (!res.ok) throw new Error("Creation failed");
                toast.success("Object created successfully");
            }

            setIsAddEditModalOpen(false);
            fetchData(); // Refresh list
        } catch (e: any) {
            toast.error(e.message || "Invalid JSON or server error");
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = (id: string) => {
        setObjectToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const executeDelete = async () => {
        if (!objectToDelete) return;
        try {
            setIsLoading(true);
            const res = await fetch(`/api/weaviate/objects?class=${className}&id=${objectToDelete}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error("Delete failed");

            toast.success("Object deleted securely");
            setIsDeleteModalOpen(false);
            setObjectToDelete(null);
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed to delete object");
        } finally {
            setIsLoading(false);
        }
    };

    // Batch delete
    const executeBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        try {
            setIsLoading(true);
            const res = await fetch(`/api/weaviate/objects?class=${className}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                },
                body: JSON.stringify({ ids: Array.from(selectedIds) })
            });
            if (!res.ok) throw new Error("Batch delete failed");

            const json = await res.json();
            toast.success(`Successfully deleted ${json.deleted} object(s)`);
            setIsBatchDeleteModalOpen(false);
            setSelectedIds(new Set());
            fetchData();
        } catch (e: any) {
            toast.error(e.message || "Failed to batch delete objects");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FileJson className="w-6 h-6 text-primary" />
                        {decodeURIComponent(className)}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage data objects for the {decodeURIComponent(className)} class.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={isLoading}>
                        <RefreshCcw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button size="sm" onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90" disabled={isLoading}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Document
                    </Button>
                </div>
            </div>

            {/* Toolbar / Search */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-2 rounded-lg border border-border">
                <div className="relative flex-1 w-full max-w-sm flex">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search specific query..."
                        className="pl-9 bg-background border-r-0 rounded-r-none focus-visible:ring-1"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                    />
                    <Button variant="secondary" className="rounded-l-none" onClick={() => fetchData()}>Search</Button>
                </div>
                <div className="text-sm text-muted-foreground px-2">
                    {data.length} object(s) loaded · {columns.length} field(s)
                </div>
            </div>

            {/* Batch Action Toolbar */}
            {selectedIds.size > 0 && (
                <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                        <span className="text-sm font-medium text-foreground">
                            {selectedIds.size} object(s) selected
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearSelection}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsBatchDeleteModalOpen(true)}
                        disabled={isLoading}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected
                    </Button>
                </div>
            )}

            {/* Data Table - Dynamic Columns */}
            <div className="rounded-md border border-border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                {/* Select All Checkbox */}
                                <TableHead className="w-[50px] sticky left-0 bg-muted/50 z-10">
                                    <Checkbox
                                        checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all"
                                    />
                                </TableHead>
                                <TableHead className="w-[100px] sticky left-[50px] bg-muted/50 z-10">UUID</TableHead>
                                {columns.map((col) => (
                                    <TableHead key={col} className="min-w-[150px]">
                                        <span className="font-semibold">{col}</span>
                                    </TableHead>
                                ))}
                                <TableHead className="text-right w-[100px] sticky right-0 bg-muted/50 z-10">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 3} className="h-40 text-center text-muted-foreground">
                                        {isLoading ? "Loading data..." : `No objects found for ${decodeURIComponent(className)}.`}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className={`group hover:bg-muted/30 transition-colors ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}
                                    >
                                        {/* Checkbox Column */}
                                        <TableCell className="sticky left-0 bg-card group-hover:bg-muted/30 transition-colors z-10">
                                            <Checkbox
                                                checked={selectedIds.has(item.id)}
                                                onCheckedChange={() => toggleSelectRow(item.id)}
                                                aria-label={`Select ${item.id}`}
                                            />
                                        </TableCell>
                                        {/* UUID Column */}
                                        <TableCell className="sticky left-[50px] bg-card group-hover:bg-muted/30 transition-colors z-10">
                                            <CopyableCell
                                                value={item.id}
                                                maxWidth={100}
                                            />
                                        </TableCell>
                                        {/* Dynamic Property Columns */}
                                        {columns.map((col) => (
                                            <TableCell key={col}>
                                                <CopyableCell
                                                    value={valueToString(item[col])}
                                                    maxWidth={250}
                                                />
                                            </TableCell>
                                        ))}
                                        {/* Actions Column */}
                                        <TableCell className="text-right sticky right-0 bg-card group-hover:bg-muted/30 transition-colors z-10">
                                            <div className="flex justify-end gap-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={() => handleOpenEdit(item)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit object</TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => confirmDelete(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete object</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card px-4 py-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page</span>
                        <select
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="ml-2">
                            {Math.min((currentPage - 1) * pageSize + 1, totalCount)}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1 || isLoading}
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="px-3 text-sm font-medium text-foreground">
                            Page {currentPage} / {Math.max(1, Math.ceil(totalCount / pageSize))}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                            disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setCurrentPage(Math.ceil(totalCount / pageSize))}
                            disabled={currentPage >= Math.ceil(totalCount / pageSize) || isLoading}
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Add / Edit Modal */}
            <Dialog open={isAddEditModalOpen} onOpenChange={setIsAddEditModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingObject ? 'Edit Object' : 'Create New Object'}</DialogTitle>
                        <DialogDescription>
                            {editingObject ? 'Modify the properties using JSON format.' : 'Specify properties constraints in JSON format.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="properties" className="block mb-2 font-semibold">
                            JSON Properties
                        </Label>
                        <textarea
                            id="properties"
                            value={propertiesJson}
                            onChange={(e) => setPropertiesJson(e.target.value)}
                            className="flex min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                            placeholder={'{\n  "title": "Example",\n  "author": "Alice"\n}'}
                            spellCheck={false}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddEditModalOpen(false)}>Cancel</Button>
                        <Button type="submit" onClick={handleSave} disabled={isLoading}>
                            {isLoading ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Single Delete Confirmation Modal */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px] border-destructive/20 bg-background">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Confirm Deletion
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete this object? This action cannot be undone and will permanently remove the item from the Weaviate database.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-destructive/10 p-3 rounded text-sm text-destructive font-mono mt-2 break-all">
                        ID: {objectToDelete}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={executeDelete} disabled={isLoading}>
                            {isLoading ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Delete Confirmation Modal */}
            <Dialog open={isBatchDeleteModalOpen} onOpenChange={setIsBatchDeleteModalOpen}>
                <DialogContent className="sm:max-w-[425px] border-destructive/20 bg-background">
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <Trash2 className="w-5 h-5" />
                            Batch Delete Confirmation
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Are you sure you want to delete <strong>{selectedIds.size}</strong> selected object(s)? This action cannot be undone and will permanently remove the items from the Weaviate database.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-destructive/10 p-3 rounded text-sm text-destructive font-mono mt-2 max-h-[200px] overflow-y-auto space-y-1">
                        {Array.from(selectedIds).map(id => (
                            <div key={id} className="truncate">{id}</div>
                        ))}
                    </div>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setIsBatchDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={executeBatchDelete} disabled={isLoading}>
                            {isLoading ? "Deleting..." : `Delete ${selectedIds.size} Object(s)`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
