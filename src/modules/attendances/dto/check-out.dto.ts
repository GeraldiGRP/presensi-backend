import { IsNotEmpty } from 'class-validator';

export class CheckOutDto {
  @IsNotEmpty()
  lat: number;

  @IsNotEmpty()
  lng: number;
}
