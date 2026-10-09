"use client";
import { useState } from "react";
import DaumPostcode, { type Address } from "react-daum-postcode";

interface AddressFieldProps {
  value: string;
  onChange: (address: string) => void;
  required?: boolean;
  error?: string;
}

const inputCls =
  "rounded-md border border-gray-300 px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export function AddressField({
  value,
  onChange,
  required,
  error,
}: AddressFieldProps) {
  const [open, setOpen] = useState(false);
  const [baseAddress, setBaseAddress] = useState("");
  const [detail, setDetail] = useState("");

  function handleComplete(data: Address) {
    const base = data.roadAddress || data.jibunAddress;
    setBaseAddress(base);
    setOpen(false);
    onChange(detail ? `${base} ${detail}` : base);
  }

  function handleDetailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value;
    setDetail(d);
    onChange(baseAddress ? `${baseAddress} ${d}`.trim() : d);
  }

  return (
    <div className="flex flex-col gap-1">
      {/* 주소 검색 버튼 + 기본주소 */}
      <div className="flex gap-2">
        <input
          readOnly
          value={baseAddress || value}
          placeholder={required ? "주소 검색 *" : "주소 검색"}
          className={`${inputCls} flex-1 bg-gray-50 cursor-default`}
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 whitespace-nowrap"
        >
          검색
        </button>
      </div>

      {/* 상세주소 */}
      {baseAddress && (
        <input
          value={detail}
          onChange={handleDetailChange}
          placeholder="상세주소 입력"
          className={inputCls}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/* 다음 주소 검색 팝업 */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-lg bg-white shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <span className="text-sm font-medium text-gray-700">주소 검색</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>
            <DaumPostcode onComplete={handleComplete} style={{ width: 460, height: 500 }} />
          </div>
        </div>
      )}
    </div>
  );
}
