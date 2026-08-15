import { IsString, IsNotEmpty } from 'class-validator';

export class CheckInDto {
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;
}
