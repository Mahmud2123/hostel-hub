"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { useHostel, useUpdateHostel } from "@/hooks/useHostels";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckboxGroup } from "@/components/ui/Checkbox";
import { Skeleton } from "@/components/ui/Skeleton";
import { FACILITIES_OPTIONS, LOCATIONS } from "@/utils/format";
import toast from "react-hot-toast";

const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l, label: l }));

export default function EditHostelPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: hostel, isLoading } = useHostel(id);
  const updateHostel = useUpdateHostel(id);

  const [form, setForm] = useState({
    name: "",
    description: "",
    location: "",
    address: "",
    price_per_year: "",
    bank_name: "",
    account_number: "",
    account_name: "",
    whatsapp_number: "",
    total_rooms: "1",
  });
  const [facilities, setFacilities] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (hostel) {
      setForm({
        name: hostel.name ?? "",
        description: hostel.description ?? "",
        location: hostel.location ?? "",
        address: hostel.address ?? "",
        price_per_year: String(hostel.price_per_year ?? ""),
        bank_name: hostel.bank_name ?? "",
        account_number: hostel.account_number ?? "",
        account_name: hostel.account_name ?? "",
        whatsapp_number: hostel.whatsapp_number ?? "",
        total_rooms: String(hostel.total_rooms ?? 1),
      });
      setFacilities(hostel.facilities ?? []);
    }
  }, [hostel]);

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.description.length < 20) errs.description = "Description must be at least 20 characters";
    if (!form.location) errs.location = "Location is required";
    if (!form.address.trim()) errs.address = "Address is required";
    if (!form.price_per_year || Number(form.price_per_year) <= 0) errs.price_per_year = "Enter a valid price";
    if (!form.bank_name.trim()) errs.bank_name = "Bank name is required";
    if (!form.account_number.trim()) errs.account_number = "Account number is required";
    if (!form.account_name.trim()) errs.account_name = "Account name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    updateHostel.mutate(
      {
        name: form.name,
        description: form.description,
        location: form.location,
        address: form.address,
        price_per_year: Number(form.price_per_year),
        bank_name: form.bank_name,
        account_number: form.account_number,
        account_name: form.account_name,
        whatsapp_number: form.whatsapp_number || undefined,
        total_rooms: Number(form.total_rooms),
        facilities,
      },
      {
        onSuccess: () => {
          toast.success("Hostel updated successfully!");
          router.push("/landlord/hostels");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!hostel) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Hostel not found.</p>
        <Link href="/landlord/hostels">
          <Button variant="outline" className="mt-4">Go Back</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/landlord/hostels">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Edit Hostel</h1>
          <p className="text-sm text-slate-400 mt-0.5">{hostel.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card variant="bordered">
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Hostel Name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              error={errors.description}
              rows={4}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="State / Location"
                options={LOCATION_OPTIONS}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                error={errors.location}
              />
              <Input
                label="Full Address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                error={errors.address}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Price Per Academic Year (₦)"
                type="number"
                value={form.price_per_year}
                onChange={(e) => set("price_per_year", e.target.value)}
                error={errors.price_per_year}
              />
              <Input
                label="Total Bed Spaces / Rooms"
                type="number"
                min="1"
                value={form.total_rooms}
                onChange={(e) => set("total_rooms", e.target.value)}
                hint="Increasing this adds new auto-numbered rooms; reducing marks excess rooms inactive"
              />
            </div>
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader><CardTitle>Facilities & Amenities</CardTitle></CardHeader>
          <CardContent>
            <CheckboxGroup
              options={FACILITIES_OPTIONS}
              selected={facilities}
              onChange={setFacilities}
              columns={2}
            />
          </CardContent>
        </Card>

        <Card variant="bordered">
          <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
                error={errors.bank_name}
              />
              <Input
                label="Account Number"
                value={form.account_number}
                onChange={(e) => set("account_number", e.target.value)}
                error={errors.account_number}
              />
            </div>
            <Input
              label="Account Name"
              value={form.account_name}
              onChange={(e) => set("account_name", e.target.value)}
              error={errors.account_name}
            />
            <Input
              label="WhatsApp Number (Optional)"
              value={form.whatsapp_number}
              onChange={(e) => set("whatsapp_number", e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/landlord/hostels">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button
            type="submit"
            loading={updateHostel.isPending}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
