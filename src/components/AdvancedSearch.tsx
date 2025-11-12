import { Medicine } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, X, Filter, Pill, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface AdvancedSearchProps {
  medicines: Medicine[];
  onFilteredResults: (filtered: Medicine[]) => void;
  lowStockThreshold?: number;
}

export const AdvancedSearch = ({ medicines, onFilteredResults, lowStockThreshold = 20 }: AdvancedSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const applyFilters = (search: string, schedule: string, stock: string, category: string) => {
    let filtered = [...medicines];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        m.dosage?.toLowerCase().includes(searchLower) ||
        m.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Schedule filter
    if (schedule !== "all") {
      filtered = filtered.filter(m => {
        if (!m.schedule) return false;
        if (schedule === 'morning') return m.schedule === 'morning' || m.schedule === 'morning_noon' || m.schedule === 'morning_night' || m.schedule === 'three_times';
        if (schedule === 'noon') return m.schedule === 'noon' || m.schedule === 'morning_noon' || m.schedule === 'noon_night' || m.schedule === 'three_times';
        if (schedule === 'night') return m.schedule === 'night' || m.schedule === 'morning_night' || m.schedule === 'noon_night' || m.schedule === 'three_times';
        return m.schedule === schedule;
      });
    }

    // Stock filter
    if (stock !== "all") {
      filtered = filtered.filter(m => {
        const stockPercent = m.totalStock > 0 ? (m.currentStock / m.totalStock) * 100 : 0;
        if (stock === 'low') return stockPercent < lowStockThreshold;
        if (stock === 'normal') return stockPercent >= lowStockThreshold && stockPercent < 100;
        if (stock === 'full') return stockPercent >= 100;
        if (stock === 'out') return m.currentStock === 0;
        return true;
      });
    }

    // Category filter
    if (category !== "all") {
      filtered = filtered.filter(m => m.category === category);
    }

    onFilteredResults(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters(value, scheduleFilter, stockFilter, categoryFilter);
  };

  const handleScheduleChange = (value: string) => {
    setScheduleFilter(value);
    applyFilters(searchTerm, value, stockFilter, categoryFilter);
  };

  const handleStockChange = (value: string) => {
    setStockFilter(value);
    applyFilters(searchTerm, scheduleFilter, value, categoryFilter);
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    applyFilters(searchTerm, scheduleFilter, stockFilter, value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setScheduleFilter("all");
    setStockFilter("all");
    setCategoryFilter("all");
    onFilteredResults(medicines);
  };

  const activeFiltersCount = 
    (searchTerm ? 1 : 0) + 
    (scheduleFilter !== "all" ? 1 : 0) + 
    (stockFilter !== "all" ? 1 : 0) +
    (categoryFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        {/* Search Input */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search medicines..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 etery-card touch-target"
          />
        </div>

        {/* Filters Row - Stack on mobile, inline on larger screens */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Schedule Filter */}
          <Select value={scheduleFilter} onValueChange={handleScheduleChange}>
            <SelectTrigger className="w-full etery-card touch-target">
              <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Schedule" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Schedules</SelectItem>
              <SelectItem value="morning">Morning</SelectItem>
              <SelectItem value="noon">Noon</SelectItem>
              <SelectItem value="night">Night</SelectItem>
              <SelectItem value="three_times">3x Daily</SelectItem>
            </SelectContent>
          </Select>

          {/* Stock Filter */}
          <Select value={stockFilter} onValueChange={handleStockChange}>
            <SelectTrigger className="w-full etery-card touch-target">
              <Pill className="h-4 w-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Stock Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock</SelectItem>
              <SelectItem value="low">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  Low Stock
                </div>
              </SelectItem>
              <SelectItem value="normal">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Normal
                </div>
              </SelectItem>
              <SelectItem value="full">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-400" />
                  Full
                </div>
              </SelectItem>
              <SelectItem value="out">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400" />
                  Out of Stock
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full etery-card touch-target">
              <Filter className="h-4 w-4 mr-2 flex-shrink-0" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="pain_relief">Pain Relief</SelectItem>
              <SelectItem value="diabetes">Diabetes</SelectItem>
              <SelectItem value="heart">Heart</SelectItem>
              <SelectItem value="blood_pressure">Blood Pressure</SelectItem>
              <SelectItem value="antibiotic">Antibiotic</SelectItem>
              <SelectItem value="vitamin">Vitamin</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="outline"
              size="icon"
              onClick={clearFilters}
              className="etery-card touch-target flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: "{searchTerm}"
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleSearchChange("")} />
            </Badge>
          )}
          {scheduleFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Schedule: {scheduleFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleScheduleChange("all")} />
            </Badge>
          )}
          {stockFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Stock: {stockFilter}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleStockChange("all")} />
            </Badge>
          )}
          {categoryFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Category: {categoryFilter.replace('_', ' ')}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleCategoryChange("all")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
