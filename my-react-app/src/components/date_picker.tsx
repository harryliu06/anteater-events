import React from 'react';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { alpha } from '@mui/material/styles';
import type { Dayjs } from 'dayjs';

type BasicDatePickerProps = {
  value?: Dayjs | null;
  onChange?: (newValue: Dayjs | null) => void;
  label?: string;
};

function BasicDatePicker({ value = null, onChange, label = 'Date' }: BasicDatePickerProps) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        label={label}
        value={value}
        onChange={onChange}
        slotProps={{
          textField: {
            size: 'small',
            sx: (theme) => ({
              color: 'inherit',
              backgroundColor: alpha(theme.palette.common.white, 0.15),
              borderRadius: theme.shape.borderRadius,
              '& .MuiInputBase-input': {
                padding: theme.spacing(1, 1, 1, 0),
                paddingLeft: `calc(1em + ${theme.spacing(4)})`,
                transition: theme.transitions.create('width'),
                [theme.breakpoints.up('sm')]: {
                  width: '12ch',
                  '&:focus': { width: '20ch' },
                },
              },
            }),
          },
        }}
      />
    </LocalizationProvider>
  );
}

export default BasicDatePicker;